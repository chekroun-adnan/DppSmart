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
import com.dppsmart.dppsmart.SupplyChain.Entities.Delivery;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrder;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrderItem;
import com.dppsmart.dppsmart.SupplyChain.Enums.DeliveryStatus;
import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import com.dppsmart.dppsmart.SupplyChain.Repositories.DeliveryRepository;
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
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final MaterialOrderRepository orderRepository;
    private final MaterialStockRepository materialStockRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;

    public DeliveryResponseDTO createDelivery(CreateDeliveryDTO dto) {
        User user = getCurrentUser();
        MaterialOrder order = orderRepository.findById(dto.getMaterialOrderId())
                .orElseThrow(() -> new NotFoundException("Purchase order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Not allowed");
        }

        Delivery delivery = new Delivery();
        delivery.setId(NanoIdUtils.randomNanoId());
        delivery.setMaterialOrderId(dto.getMaterialOrderId());
        delivery.setOrganizationId(order.getOrganizationId());
        delivery.setStatus(DeliveryStatus.PENDING);
        delivery.setTrackingNumber(dto.getTrackingNumber());
        delivery.setCarrier(dto.getCarrier());
        delivery.setNotes(dto.getNotes());
        delivery.setPhotos(dto.getPhotos());
        delivery.setShippedBy(user.getEmail());
        delivery.setShippedAt(LocalDateTime.now());
        delivery.setCreatedAt(LocalDateTime.now());
        delivery.setUpdatedAt(LocalDateTime.now());

        List<Delivery.DeliveryItem> items = new ArrayList<>();
        int totalQty = 0;

        for (CreateDeliveryDTO.DeliveryItemDTO itemDto : dto.getItems()) {
            MaterialOrderItem orderItem = order.getItems().stream()
                    .filter(i -> i.getId().equals(itemDto.getItemId()))
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException("Order item not found: " + itemDto.getItemId()));

            int remaining = orderItem.getRemainingQuantity() != null ? orderItem.getRemainingQuantity()
                    : orderItem.getOrderedQuantity() - orderItem.getAcceptedQuantity();

            if (itemDto.getQuantity() > remaining) {
                throw new BadRequestException("Delivery quantity exceeds remaining order quantity for: " + orderItem.getMaterialName());
            }

            Delivery.DeliveryItem item = new Delivery.DeliveryItem();
            item.setItemId(itemDto.getItemId());
            item.setMaterialId(itemDto.getMaterialId());
            item.setMaterialName(orderItem.getMaterialName());
            item.setQuantity(itemDto.getQuantity());
            item.setAcceptedQuantity(0);
            item.setRejectedQuantity(0);
            item.setConditionStatus("pending");
            items.add(item);
            totalQty += itemDto.getQuantity();
        }

        delivery.setItems(items);
        delivery.setTotalQuantity(totalQty);
        Delivery saved = deliveryRepository.save(delivery);

        if (order.getDeliveryIds() == null) order.setDeliveryIds(new ArrayList<>());
        order.getDeliveryIds().add(saved.getId());
        order.setStatus(MaterialOrderStatus.SHIPPED);
        order.setShippedAt(LocalDateTime.now());
        orderRepository.save(order);

        auditService.log("Delivery", saved.getId(), "CREATE", order.getOrganizationId(), null,
                "Delivery created for order: " + order.getOrderNumber());

        notificationService.createNotification(user.getId(), "Delivery Created",
                "Delivery #" + saved.getId() + " created for order " + order.getOrderNumber(),
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.DELIVERY,
                "/material-orders/" + order.getId());

        return toDTO(saved);
    }

    public List<DeliveryResponseDTO> getDeliveriesByOrder(String orderId) {
        User user = getCurrentUser();
        orderRepository.findById(orderId).orElseThrow(() -> new NotFoundException("Order not found"));
        return deliveryRepository.findByMaterialOrderId(orderId).stream().map(this::toDTO).toList();
    }

    public List<DeliveryResponseDTO> getDeliveriesByOrg(String orgId) {
        User user = getCurrentUser();
        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, orgId)) {
            throw new ForbiddenException("Not allowed");
        }
        return deliveryRepository.findByOrganizationId(orgId).stream().map(this::toDTO).toList();
    }

    public DeliveryResponseDTO getById(String id) {
        return toDTO(deliveryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Delivery not found")));
    }

    public DeliveryResponseDTO receiveDelivery(String deliveryId, ReceivingInspectionDTO dto) {
        User user = getCurrentUser();
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new NotFoundException("Delivery not found"));

        if (!permissionService.canAccessOrganization(user, delivery.getOrganizationId())) {
            throw new ForbiddenException("Not allowed");
        }

        MaterialOrder order = orderRepository.findById(delivery.getMaterialOrderId())
                .orElseThrow(() -> new NotFoundException("Order not found"));

        int totalAccepted = 0;
        int totalRejected = 0;

        for (ReceivingInspectionDTO.ItemInspectionDTO itemInsp : dto.getItems()) {
            Delivery.DeliveryItem delItem = delivery.getItems().stream()
                    .filter(i -> i.getItemId().equals(itemInsp.getItemId()))
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException("Delivery item not found: " + itemInsp.getItemId()));

            MaterialOrderItem orderItem = order.getItems().stream()
                    .filter(i -> i.getId().equals(itemInsp.getItemId()))
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException("Order item not found"));

            int accepted = itemInsp.getAcceptedQuantity() != null ? itemInsp.getAcceptedQuantity() : 0;
            int rejected = itemInsp.getRejectedQuantity() != null ? itemInsp.getRejectedQuantity() : 0;

            if (accepted + rejected > itemInsp.getReceivedQuantity()) {
                throw new BadRequestException("Accepted + rejected exceeds received quantity for: " + delItem.getMaterialName());
            }

            delItem.setAcceptedQuantity(accepted);
            delItem.setRejectedQuantity(rejected);
            if (itemInsp.getConditionStatus() != null) delItem.setConditionStatus(itemInsp.getConditionStatus());
            if (itemInsp.getNotes() != null) delItem.setNotes(itemInsp.getNotes());

            orderItem.setReceivedQuantity((orderItem.getReceivedQuantity() != null ? orderItem.getReceivedQuantity() : 0) + itemInsp.getReceivedQuantity());
            orderItem.setAcceptedQuantity(orderItem.getAcceptedQuantity() + accepted);
            orderItem.setRejectedQuantity(orderItem.getRejectedQuantity() + rejected);
            orderItem.setRemainingQuantity(orderItem.getOrderedQuantity() - orderItem.getAcceptedQuantity() - orderItem.getReturnedQuantity());

            addToStock(orderItem, order.getOrganizationId(), accepted);

            totalAccepted += accepted;
            totalRejected += rejected;
        }

        delivery.setReceivedBy(user.getEmail());
        delivery.setReceivedAt(LocalDateTime.now());
        delivery.setStatus(DeliveryStatus.DELIVERED);
        delivery.setUpdatedAt(LocalDateTime.now());
        if (dto.getNotes() != null) delivery.setNotes(dto.getNotes());
        deliveryRepository.save(delivery);

        order.setTotalReceivedQuantity((order.getTotalReceivedQuantity() != null ? order.getTotalReceivedQuantity() : 0) + totalAccepted + totalRejected);
        order.setTotalAcceptedQuantity(order.getTotalAcceptedQuantity() + totalAccepted);
        order.setTotalRejectedQuantity(order.getTotalRejectedQuantity() + totalRejected);
        order.setReceivedAt(LocalDateTime.now());
        updateOrderStatus(order, totalAccepted, totalRejected);
        orderRepository.save(order);

        auditService.log("Delivery", delivery.getId(), "RECEIVE", order.getOrganizationId(), null,
                "Delivery received for order: " + order.getOrderNumber() + " | Accepted: " + totalAccepted + " Rejected: " + totalRejected);

        notificationService.createNotification(user.getId(), "Delivery Received",
                "Delivery for order " + order.getOrderNumber() + " received. Accepted: " + totalAccepted,
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.DELIVERY,
                "/material-orders/" + order.getId());

        return toDTO(delivery);
    }

    private void updateOrderStatus(MaterialOrder order, int totalAccepted, int totalRejected) {
        boolean allDelivered = order.getItems().stream()
                .allMatch(i -> (i.getReceivedQuantity() != null && i.getReceivedQuantity() > 0));
        boolean anyDelivered = order.getItems().stream()
                .anyMatch(i -> (i.getReceivedQuantity() != null && i.getReceivedQuantity() > 0));

        if (totalRejected > 0 && totalAccepted > 0) {
            order.setStatus(MaterialOrderStatus.PARTIALLY_RECEIVED);
        } else if (totalRejected > 0 && totalAccepted == 0) {
            order.setStatus(MaterialOrderStatus.DISPUTED);
        } else if (allDelivered) {
            int totalAcceptedAll = order.getItems().stream().mapToInt(i -> i.getAcceptedQuantity() != null ? i.getAcceptedQuantity() : 0).sum();
            int totalOrdered = order.getItems().stream().mapToInt(MaterialOrderItem::getOrderedQuantity).sum();
            if (totalAcceptedAll >= totalOrdered) {
                order.setStatus(MaterialOrderStatus.COMPLETED);
            } else {
                order.setStatus(MaterialOrderStatus.RECEIVED);
            }
        } else if (anyDelivered) {
            order.setStatus(MaterialOrderStatus.PARTIALLY_RECEIVED);
        }
    }

    private void addToStock(MaterialOrderItem item, String orgId, int acceptedQty) {
        if (acceptedQty <= 0) return;
        List<MaterialStock> existing = materialStockRepository.findByOrganizationId(orgId).stream()
                .filter(s -> s.getId().equals(item.getMaterialId()) ||
                        (item.getMaterialName() != null && s.getName().equals(item.getMaterialName())))
                .toList();
        if (!existing.isEmpty()) {
            MaterialStock stock = existing.get(0);
            stock.setQuantity(stock.getQuantity() + acceptedQty);
            stock.setUpdatedAt(LocalDateTime.now());
            materialStockRepository.save(stock);
        } else {
            MaterialStock newStock = new MaterialStock();
            newStock.setId(NanoIdUtils.randomNanoId());
            newStock.setName(item.getMaterialName());
            newStock.setReferenceCode(item.getMaterialReference());
            newStock.setQuantity(acceptedQty);
            newStock.setMinimumThreshold(0);
            newStock.setUnit(item.getUnit());
            newStock.setOrganizationId(orgId);
            newStock.setUpdatedAt(LocalDateTime.now());
            materialStockRepository.save(newStock);
        }
    }

    private DeliveryResponseDTO toDTO(Delivery d) {
        DeliveryResponseDTO dto = new DeliveryResponseDTO();
        dto.setId(d.getId());
        dto.setMaterialOrderId(d.getMaterialOrderId());
        dto.setOrganizationId(d.getOrganizationId());
        dto.setStatus(d.getStatus() != null ? d.getStatus().name() : null);
        dto.setTotalQuantity(d.getTotalQuantity());
        dto.setTrackingNumber(d.getTrackingNumber());
        dto.setCarrier(d.getCarrier());
        dto.setNotes(d.getNotes());
        dto.setPhotos(d.getPhotos());
        dto.setShippedBy(d.getShippedBy());
        dto.setShippedAt(d.getShippedAt());
        dto.setReceivedBy(d.getReceivedBy());
        dto.setReceivedAt(d.getReceivedAt());
        dto.setCreatedAt(d.getCreatedAt());
        dto.setUpdatedAt(d.getUpdatedAt());
        if (d.getItems() != null) {
            dto.setItems(d.getItems().stream().map(i -> {
                DeliveryResponseDTO.DeliveryItemResponseDTO itemDto = new DeliveryResponseDTO.DeliveryItemResponseDTO();
                itemDto.setItemId(i.getItemId());
                itemDto.setMaterialId(i.getMaterialId());
                itemDto.setMaterialName(i.getMaterialName());
                itemDto.setQuantity(i.getQuantity());
                itemDto.setAcceptedQuantity(i.getAcceptedQuantity());
                itemDto.setRejectedQuantity(i.getRejectedQuantity());
                itemDto.setConditionStatus(i.getConditionStatus());
                itemDto.setNotes(i.getNotes());
                return itemDto;
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