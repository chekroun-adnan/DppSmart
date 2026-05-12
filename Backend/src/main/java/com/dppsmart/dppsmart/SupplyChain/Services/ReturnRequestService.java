package com.dppsmart.dppsmart.SupplyChain.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.SupplyChain.DTO.*;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrder;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrderItem;
import com.dppsmart.dppsmart.SupplyChain.Entities.ReturnRequest;
import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import com.dppsmart.dppsmart.SupplyChain.Enums.ReturnRequestStatus;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialOrderRepository;
import com.dppsmart.dppsmart.SupplyChain.Repositories.ReturnRequestRepository;
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
public class ReturnRequestService {

    private final ReturnRequestRepository returnRequestRepository;
    private final MaterialOrderRepository orderRepository;
    private final MaterialStockRepository materialStockRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;

    public ReturnRequestResponseDTO createReturnRequest(CreateReturnRequestDTO dto) {
        User user = getCurrentUser();
        MaterialOrder order = orderRepository.findById(dto.getPurchaseOrderId())
                .orElseThrow(() -> new NotFoundException("Purchase order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Not allowed to access this organization");
        }

        MaterialOrderItem item = order.getItems().stream()
                .filter(i -> i.getId().equals(dto.getPurchaseOrderItemId()))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Order item not found"));

        int maxReturnable = item.getAcceptedQuantity() - (item.getReturnedQuantity() != null ? item.getReturnedQuantity() : 0);
        if (dto.getQuantity() > maxReturnable) {
            throw new BadRequestException("Return quantity exceeds accepted quantity. Max returnable: " + maxReturnable);
        }

        ReturnRequest request = new ReturnRequest();
        request.setId(NanoIdUtils.randomNanoId());
        request.setReturnId("RET-" + System.currentTimeMillis());
        request.setPurchaseOrderId(dto.getPurchaseOrderId());
        request.setPurchaseOrderItemId(dto.getPurchaseOrderItemId());
        request.setMaterialId(dto.getMaterialId());
        request.setMaterialName(item.getMaterialName());
        request.setOrganizationId(order.getOrganizationId());
        request.setQuantity(dto.getQuantity());
        request.setReason(dto.getReason());
        request.setNotes(dto.getNotes());
        request.setStatus(ReturnRequestStatus.PENDING);
        request.setCreatedBy(user.getEmail());
        request.setCreatedAt(LocalDateTime.now());

        ReturnRequest saved = returnRequestRepository.save(request);

        if (order.getReturnRequestIds() == null) order.setReturnRequestIds(new ArrayList<>());
        order.getReturnRequestIds().add(saved.getId());
        orderRepository.save(order);

        auditService.log("ReturnRequest", saved.getId(), "CREATE", order.getOrganizationId(), null,
                "Return request created for " + item.getMaterialName() + " qty: " + dto.getQuantity());

        notificationService.createNotification(user.getId(), "Return Request Created",
                "Return request " + saved.getReturnId() + " for " + item.getMaterialName(),
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.DELIVERY,
                "/material-orders/" + order.getId());

        return toDTO(saved);
    }

    public List<ReturnRequestResponseDTO> getReturnsByOrder(String orderId) {
        User user = getCurrentUser();
        orderRepository.findById(orderId).orElseThrow(() -> new NotFoundException("Order not found"));
        return returnRequestRepository.findByPurchaseOrderId(orderId).stream().map(this::toDTO).toList();
    }

    public List<ReturnRequestResponseDTO> getReturnsByOrg(String orgId) {
        User user = getCurrentUser();
        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, orgId)) {
            throw new ForbiddenException("Not allowed");
        }
        return returnRequestRepository.findByOrganizationId(orgId).stream().map(this::toDTO).toList();
    }

    public List<ReturnRequestResponseDTO> getReturnsByStatus(String status) {
        ReturnRequestStatus s = ReturnRequestStatus.valueOf(status.toUpperCase());
        return returnRequestRepository.findByStatus(s).stream().map(this::toDTO).toList();
    }

    public ReturnRequestResponseDTO getById(String id) {
        ReturnRequest request = returnRequestRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Return request not found"));
        return toDTO(request);
    }

    public ReturnRequestResponseDTO updateReturnRequest(String id, UpdateReturnRequestDTO dto) {
        User user = getCurrentUser();
        ReturnRequest request = returnRequestRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Return request not found"));

        if (!permissionService.canAccessOrganization(user, request.getOrganizationId())) {
            throw new ForbiddenException("Not allowed");
        }

        MaterialOrder order = orderRepository.findById(request.getPurchaseOrderId())
                .orElseThrow(() -> new NotFoundException("Order not found"));

        MaterialOrderItem item = order.getItems().stream()
                .filter(i -> i.getId().equals(request.getPurchaseOrderItemId()))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Item not found"));

        if (dto.getStatus() != null) {
            ReturnRequestStatus newStatus = ReturnRequestStatus.valueOf(dto.getStatus().toUpperCase());
            request.setStatus(newStatus);

            if (newStatus == ReturnRequestStatus.APPROVED) {
                request.setApprovedAt(LocalDateTime.now());
                request.setApprovedBy(user.getEmail());

                int currentReturned = item.getReturnedQuantity() != null ? item.getReturnedQuantity() : 0;
                item.setReturnedQuantity(currentReturned + request.getQuantity());
                int remaining = (item.getAcceptedQuantity() - currentReturned) - request.getQuantity();
                item.setRemainingQuantity(Math.max(0, remaining));
                item.setConditionStatus("return_approved");

                removeFromStock(item, order.getOrganizationId(), request.getQuantity());
                order.setTotalReturnedQuantity((order.getTotalReturnedQuantity() != null ? order.getTotalReturnedQuantity() : 0) + request.getQuantity());

                updateOrderStatus(order);
                orderRepository.save(order);
            }
        }

        if (dto.getSupplierResponse() != null) request.setSupplierResponse(dto.getSupplierResponse());
        if (dto.getNotes() != null) request.setNotes(dto.getNotes());
        if (dto.getReturnTrackingNumber() != null) request.setReturnTrackingNumber(dto.getReturnTrackingNumber());
        if (dto.getCarrier() != null) request.setCarrier(dto.getCarrier());

        ReturnRequest saved = returnRequestRepository.save(request);

        auditService.log("ReturnRequest", saved.getId(), "UPDATE", request.getOrganizationId(), null,
                "Return request updated: " + saved.getStatus());

        notificationService.createNotification(user.getId(), "Return Request Updated",
                "Return " + saved.getReturnId() + " status: " + saved.getStatus(),
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.DELIVERY,
                "/material-orders/" + request.getPurchaseOrderId());

        return toDTO(saved);
    }

    private void updateOrderStatus(MaterialOrder order) {
        int totalReturned = order.getItems().stream()
                .mapToInt(i -> i.getReturnedQuantity() != null ? i.getReturnedQuantity() : 0)
                .sum();
        int totalAccepted = order.getItems().stream()
                .mapToInt(MaterialOrderItem::getAcceptedQuantity)
                .sum();
        if (totalReturned > 0 && totalReturned < totalAccepted) {
            order.setStatus(MaterialOrderStatus.PARTIALLY_RECEIVED);
        } else if (totalReturned > 0) {
            order.setStatus(MaterialOrderStatus.RETURNED);
        }
    }

    private void removeFromStock(MaterialOrderItem item, String orgId, int quantity) {
        List<MaterialStock> existing = materialStockRepository.findByOrganizationId(orgId).stream()
                .filter(s -> s.getId().equals(item.getMaterialId()) ||
                        (item.getMaterialName() != null && s.getName().equals(item.getMaterialName())))
                .toList();
        if (!existing.isEmpty()) {
            MaterialStock stock = existing.get(0);
            stock.setQuantity(Math.max(0, stock.getQuantity() - quantity));
            stock.setUpdatedAt(LocalDateTime.now());
            materialStockRepository.save(stock);
        }
    }

    private ReturnRequestResponseDTO toDTO(ReturnRequest r) {
        ReturnRequestResponseDTO dto = new ReturnRequestResponseDTO();
        dto.setId(r.getId());
        dto.setReturnId(r.getReturnId());
        dto.setPurchaseOrderId(r.getPurchaseOrderId());
        dto.setPurchaseOrderItemId(r.getPurchaseOrderItemId());
        dto.setMaterialId(r.getMaterialId());
        dto.setMaterialName(r.getMaterialName());
        dto.setOrganizationId(r.getOrganizationId());
        dto.setQuantity(r.getQuantity());
        dto.setReason(r.getReason());
        dto.setStatus(r.getStatus() != null ? r.getStatus().name() : null);
        dto.setCreatedBy(r.getCreatedBy());
        dto.setCreatedAt(r.getCreatedAt());
        dto.setApprovedAt(r.getApprovedAt());
        dto.setApprovedBy(r.getApprovedBy());
        dto.setSupplierResponse(r.getSupplierResponse());
        dto.setNotes(r.getNotes());
        dto.setReturnTrackingNumber(r.getReturnTrackingNumber());
        dto.setCarrier(r.getCarrier());
        return dto;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}