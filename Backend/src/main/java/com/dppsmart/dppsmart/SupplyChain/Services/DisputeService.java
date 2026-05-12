package com.dppsmart.dppsmart.SupplyChain.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.SupplyChain.DTO.*;
import com.dppsmart.dppsmart.SupplyChain.Entities.Dispute;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrder;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrderItem;
import com.dppsmart.dppsmart.SupplyChain.Enums.DisputeStatus;
import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import com.dppsmart.dppsmart.SupplyChain.Repositories.DisputeRepository;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialOrderRepository;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DisputeService {

    private final DisputeRepository disputeRepository;
    private final MaterialOrderRepository orderRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;

    public DisputeResponseDTO createDispute(CreateDisputeDTO dto) {
        User user = getCurrentUser();
        MaterialOrder order = orderRepository.findById(dto.getPurchaseOrderId())
                .orElseThrow(() -> new NotFoundException("Purchase order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Not allowed");
        }

        MaterialOrderItem item = order.getItems().stream()
                .filter(i -> i.getId().equals(dto.getPurchaseOrderItemId()))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Order item not found"));

        Dispute dispute = new Dispute();
        dispute.setId(NanoIdUtils.randomNanoId());
        dispute.setPurchaseOrderId(dto.getPurchaseOrderId());
        dispute.setPurchaseOrderItemId(dto.getPurchaseOrderItemId());
        dispute.setMaterialId(dto.getMaterialId());
        dispute.setMaterialName(item.getMaterialName());
        dispute.setOrganizationId(order.getOrganizationId());
        dispute.setType(dto.getType());
        dispute.setDescription(dto.getDescription());
        dispute.setStatus(DisputeStatus.OPEN);
        dispute.setRaisedBy(user.getEmail());
        dispute.setCreatedAt(LocalDateTime.now());
        dispute.setMessages(new ArrayList<>());

        Dispute saved = disputeRepository.save(dispute);

        if (order.getDisputeIds() == null) order.setDisputeIds(new ArrayList<>());
        order.getDisputeIds().add(saved.getId());
        order.setStatus(MaterialOrderStatus.DISPUTED);
        orderRepository.save(order);

        auditService.log("Dispute", saved.getId(), "CREATE", order.getOrganizationId(), null,
                "Dispute raised for: " + item.getMaterialName() + " - " + dto.getType());

        notificationService.createNotification(user.getId(), "Dispute Created",
                "Dispute raised for " + item.getMaterialName() + " on order " + order.getOrderNumber(),
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.DELIVERY,
                "/material-orders/" + order.getId());

        return toDTO(saved);
    }

    public List<DisputeResponseDTO> getDisputesByOrder(String orderId) {
        User user = getCurrentUser();
        orderRepository.findById(orderId).orElseThrow(() -> new NotFoundException("Order not found"));
        return disputeRepository.findByPurchaseOrderId(orderId).stream().map(this::toDTO).toList();
    }

    public List<DisputeResponseDTO> getDisputesByOrg(String orgId) {
        User user = getCurrentUser();
        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, orgId)) {
            throw new ForbiddenException("Not allowed");
        }
        return disputeRepository.findByOrganizationId(orgId).stream().map(this::toDTO).toList();
    }

    public List<DisputeResponseDTO> getDisputesByStatus(String status) {
        DisputeStatus s = DisputeStatus.valueOf(status.toUpperCase());
        return disputeRepository.findByStatus(s).stream().map(this::toDTO).toList();
    }

    public DisputeResponseDTO getById(String id) {
        return toDTO(disputeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Dispute not found")));
    }

    public DisputeResponseDTO updateDispute(String id, UpdateDisputeDTO dto) {
        User user = getCurrentUser();
        Dispute dispute = disputeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Dispute not found"));

        if (!permissionService.canAccessOrganization(user, dispute.getOrganizationId())) {
            throw new ForbiddenException("Not allowed");
        }

        MaterialOrder order = orderRepository.findById(dispute.getPurchaseOrderId())
                .orElseThrow(() -> new NotFoundException("Order not found"));

        if (dto.getStatus() != null) {
            DisputeStatus newStatus = DisputeStatus.valueOf(dto.getStatus().toUpperCase());
            dispute.setStatus(newStatus);
            if (newStatus == DisputeStatus.RESOLVED || newStatus == DisputeStatus.CLOSED) {
                dispute.setResolvedAt(LocalDateTime.now());
                dispute.setResolvedBy(user.getEmail());
                if (dto.getResolution() != null) dispute.setResolution(dto.getResolution());
            }
        }

        if (dto.getSupplierResponse() != null) dispute.setSupplierResponse(dto.getSupplierResponse());

        if (dto.getMessage() != null && !dto.getMessage().isBlank()) {
            if (dispute.getMessages() == null) dispute.setMessages(new ArrayList<>());
            Dispute.DisputeMessage msg = new Dispute.DisputeMessage();
            msg.setSender(user.getEmail());
            msg.setSenderRole(user.getRole() != null ? user.getRole().name() : "EMPLOYEE");
            msg.setMessage(dto.getMessage());
            msg.setTimestamp(LocalDateTime.now());
            dispute.getMessages().add(msg);
        }

        Dispute saved = disputeRepository.save(dispute);

        auditService.log("Dispute", saved.getId(), "UPDATE", dispute.getOrganizationId(), null,
                "Dispute updated: " + saved.getStatus());

        notificationService.createNotification(user.getId(), "Dispute Updated",
                "Dispute for " + dispute.getMaterialName() + " status: " + saved.getStatus(),
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.DELIVERY,
                "/material-orders/" + dispute.getPurchaseOrderId());

        return toDTO(saved);
    }

    private DisputeResponseDTO toDTO(Dispute d) {
        DisputeResponseDTO dto = new DisputeResponseDTO();
        dto.setId(d.getId());
        dto.setPurchaseOrderId(d.getPurchaseOrderId());
        dto.setPurchaseOrderItemId(d.getPurchaseOrderItemId());
        dto.setMaterialId(d.getMaterialId());
        dto.setMaterialName(d.getMaterialName());
        dto.setOrganizationId(d.getOrganizationId());
        dto.setType(d.getType());
        dto.setDescription(d.getDescription());
        dto.setStatus(d.getStatus() != null ? d.getStatus().name() : null);
        dto.setRaisedBy(d.getRaisedBy());
        dto.setCreatedAt(d.getCreatedAt());
        dto.setResolvedAt(d.getResolvedAt());
        dto.setResolvedBy(d.getResolvedBy());
        dto.setResolution(d.getResolution());
        dto.setSupplierResponse(d.getSupplierResponse());
        if (d.getMessages() != null) {
            dto.setMessages(d.getMessages().stream().map(m -> {
                DisputeResponseDTO.DisputeMessageDTO msgDto = new DisputeResponseDTO.DisputeMessageDTO();
                msgDto.setSender(m.getSender());
                msgDto.setSenderRole(m.getSenderRole());
                msgDto.setMessage(m.getMessage());
                msgDto.setTimestamp(m.getTimestamp());
                return msgDto;
            }).toList());
        }
        return dto;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}