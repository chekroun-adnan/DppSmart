package com.dppsmart.dppsmart.SupplyChain.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.SupplyChain.DTO.*;
import com.dppsmart.dppsmart.SupplyChain.Entities.*;
import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import com.dppsmart.dppsmart.SupplyChain.Enums.ReceptionDecision;
import com.dppsmart.dppsmart.SupplyChain.Mapper.MaterialOrderMapper;
import com.dppsmart.dppsmart.SupplyChain.Mapper.MaterialReceptionMapper;
import com.dppsmart.dppsmart.SupplyChain.Mapper.MaterialTrackingMapper;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialOrderRepository;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialReceptionRepository;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialTrackingRepository;
import com.dppsmart.dppsmart.SupplyChain.Repositories.SupplierRepository;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MaterialOrderService {

    private final MaterialOrderRepository orderRepository;
    private final MaterialTrackingRepository trackingRepository;
    private final MaterialReceptionRepository receptionRepository;
    private final SupplierRepository supplierRepository;
    private final MaterialStockRepository materialStockRepository;
    private final OrganizationRepository organizationRepository;
    private final MaterialOrderMapper orderMapper;
    private final MaterialTrackingMapper trackingMapper;
    private final MaterialReceptionMapper receptionMapper;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public MaterialOrderResponseDTO createOrder(CreateMaterialOrderDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        if (!permissionService.canAccessOrganization(user, dto.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new NotFoundException("Supplier not found"));

        MaterialOrder order = new MaterialOrder();
        order.setId(NanoIdUtils.randomNanoId());
        order.setOrderNumber(generateOrderNumber());
        order.setSupplierId(dto.getSupplierId());
        order.setOrganizationId(dto.getOrganizationId());
        order.setOrderedBy(user.getEmail());
        order.setStatus(MaterialOrderStatus.ORDERED);
        if (dto.getExpectedDeliveryDate() != null) {
            order.setExpectedDeliveryDate(LocalDate.parse(dto.getExpectedDeliveryDate()));
        }
        order.setNotes(dto.getNotes());
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        List<MaterialOrderItem> items = dto.getItems().stream().map(itemDto -> {
            MaterialOrderItem item = new MaterialOrderItem();
            item.setId(NanoIdUtils.randomNanoId());
            item.setMaterialId(itemDto.getMaterialId());
            item.setMaterialName(itemDto.getMaterialName());
            item.setMaterialReference(itemDto.getMaterialReference());
            item.setOrderedQuantity(itemDto.getOrderedQuantity());
            item.setApprovedQuantity(0);
            item.setRejectedQuantity(0);
            item.setUnit(itemDto.getUnit());
            item.setConditionStatus("pending");
            item.setNotes(itemDto.getNotes());
            return item;
        }).toList();

        order.setItems(items);
        order.setTotalOrderedQuantity(items.stream().mapToInt(MaterialOrderItem::getOrderedQuantity).sum());
        order.setTotalApprovedQuantity(0);
        order.setTotalRejectedQuantity(0);

        MaterialOrder saved = orderRepository.save(order);

        MaterialTracking tracking = new MaterialTracking();
        tracking.setId(NanoIdUtils.randomNanoId());
        tracking.setMaterialOrderId(saved.getId());
        tracking.setCurrentStatus("ORDERED");
        tracking.setLastUpdatedAt(LocalDateTime.now());
        trackingRepository.save(tracking);

        auditService.log("MaterialOrder", saved.getId(), "CREATE", saved.getOrganizationId(), null, "Order created: " + saved.getOrderNumber());

        MaterialOrderResponseDTO response = orderMapper.toDto(saved);
        enrichSupplierName(response);
        return response;
    }

    public List<MaterialOrderResponseDTO> getAll() {
        User user = getCurrentUser();
        List<MaterialOrderResponseDTO> orders = orderRepository.findAll().stream()
                .filter(o -> permissionService.isAdmin(user) || permissionService.canAccessOrganization(user, o.getOrganizationId()))
                .map(orderMapper::toDto)
                .toList();
        orders.forEach(this::enrichSupplierName);
        return orders;
    }

    public List<MaterialOrderResponseDTO> getByOrg(String orgId) {
        User user = getCurrentUser();
        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, orgId)) {
            throw new ForbiddenException("You are not allowed to access this organization");
        }
        List<MaterialOrderResponseDTO> orders = orderRepository.findByOrganizationId(orgId).stream()
                .map(orderMapper::toDto).toList();
        orders.forEach(this::enrichSupplierName);
        return orders;
    }

    public List<MaterialOrderResponseDTO> getByStatus(String orgId, String status) {
        User user = getCurrentUser();
        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, orgId)) {
            throw new ForbiddenException("You are not allowed to access this organization");
        }
        MaterialOrderStatus orderStatus = MaterialOrderStatus.valueOf(status.toUpperCase());
        List<MaterialOrderResponseDTO> orders = orderRepository.findByOrganizationIdAndStatus(orgId, orderStatus).stream()
                .map(orderMapper::toDto).toList();
        orders.forEach(this::enrichSupplierName);
        return orders;
    }

    public MaterialOrderResponseDTO getById(String id) {
        User user = getCurrentUser();
        MaterialOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to access this order");
        }

        MaterialOrderResponseDTO response = orderMapper.toDto(order);
        enrichSupplierName(response);
        return response;
    }

    public MaterialOrderResponseDTO updateOrder(String id, UpdateMaterialOrderDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        MaterialOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this order");
        }

        if (dto.getExpectedDeliveryDate() != null) {
            order.setExpectedDeliveryDate(LocalDate.parse(dto.getExpectedDeliveryDate()));
        }
        if (dto.getNotes() != null) order.setNotes(dto.getNotes());
        if (dto.getStatus() != null) {
            order.setStatus(MaterialOrderStatus.valueOf(dto.getStatus().toUpperCase()));
        }
        order.setUpdatedAt(LocalDateTime.now());

        MaterialOrder saved = orderRepository.save(order);

        auditService.log("MaterialOrder", saved.getId(), "UPDATE", saved.getOrganizationId(), null, "Order updated: " + saved.getOrderNumber());

        MaterialOrderResponseDTO response = orderMapper.toDto(saved);
        enrichSupplierName(response);
        return response;
    }

    public void deleteOrder(String id) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        MaterialOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to delete this order");
        }

        orderRepository.delete(order);

        auditService.log("MaterialOrder", id, "DELETE", order.getOrganizationId(), null, "Order deleted: " + order.getOrderNumber());
    }

    // Tracking
    public TrackingResponseDTO updateTracking(String orderId, CreateTrackingDTO dto) {
        User user = getCurrentUser();

        MaterialOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update tracking for this order");
        }

        List<MaterialTracking> trackings = trackingRepository.findByMaterialOrderId(orderId);
        MaterialTracking tracking = trackings.isEmpty() ? null : trackings.get(0);

        if (tracking == null) {
            tracking = new MaterialTracking();
            tracking.setId(NanoIdUtils.randomNanoId());
            tracking.setMaterialOrderId(orderId);
        }

        if (dto.getCurrentLatitude() != null) tracking.setCurrentLatitude(dto.getCurrentLatitude());
        if (dto.getCurrentLongitude() != null) tracking.setCurrentLongitude(dto.getCurrentLongitude());
        if (dto.getCurrentStatus() != null) tracking.setCurrentStatus(dto.getCurrentStatus());
        if (dto.getEstimatedArrival() != null) tracking.setEstimatedArrival(LocalDateTime.parse(dto.getEstimatedArrival()));
        tracking.setLastUpdatedAt(LocalDateTime.now());

        MaterialTracking saved = trackingRepository.save(tracking);

        if (dto.getCurrentStatus() != null) {
            try {
                MaterialOrderStatus orderStatus = MaterialOrderStatus.valueOf(dto.getCurrentStatus().toUpperCase());
                if (order.getStatus() != orderStatus) {
                    order.setStatus(orderStatus);
                    order.setUpdatedAt(LocalDateTime.now());
                    orderRepository.save(order);
                }
            } catch (IllegalArgumentException ignored) {}
        }

        auditService.log("MaterialTracking", saved.getId(), "UPDATE", order.getOrganizationId(), null, "Tracking updated for order: " + order.getOrderNumber());

        return trackingMapper.toDto(saved);
    }

    public List<TrackingResponseDTO> getTrackingHistory(String orderId) {
        User user = getCurrentUser();
        orderRepository.findById(orderId).orElseThrow(() -> new NotFoundException("Material order not found"));

        return trackingRepository.findByMaterialOrderId(orderId).stream().map(trackingMapper::toDto).toList();
    }

    // Reception
    public ReceptionResponseDTO validateReception(CreateReceptionDTO dto) {
        User user = getCurrentUser();

        MaterialOrder order = orderRepository.findById(dto.getMaterialOrderId())
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to validate reception for this order");
        }

        ReceptionDecision decision = ReceptionDecision.valueOf(dto.getDecision().toUpperCase());

        int totalApproved = 0;
        int totalRejected = 0;

        if (dto.getItemDecisions() != null) {
            for (CreateReceptionDTO.ItemReceptionDTO itemDecision : dto.getItemDecisions()) {
                MaterialOrderItem item = order.getItems().stream()
                        .filter(i -> i.getId().equals(itemDecision.getItemId()))
                        .findFirst()
                        .orElseThrow(() -> new NotFoundException("Order item not found: " + itemDecision.getItemId()));

                int approved = itemDecision.getApprovedQuantity() != null ? itemDecision.getApprovedQuantity() : 0;
                int rejected = itemDecision.getRejectedQuantity() != null ? itemDecision.getRejectedQuantity() : 0;

                if (approved + rejected > item.getOrderedQuantity()) {
                    throw new BadRequestException("Approved + rejected quantity exceeds ordered quantity for item: " + item.getMaterialName());
                }

                item.setApprovedQuantity(approved);
                item.setRejectedQuantity(rejected);
                if (itemDecision.getConditionStatus() != null) item.setConditionStatus(itemDecision.getConditionStatus());
                if (itemDecision.getNotes() != null) item.setNotes(itemDecision.getNotes());

                totalApproved += approved;
                totalRejected += rejected;
            }
        }

        order.setTotalApprovedQuantity(totalApproved);
        order.setTotalRejectedQuantity(totalRejected);

        if (decision == ReceptionDecision.APPROVED) {
            order.setStatus(MaterialOrderStatus.APPROVED);
            addToStock(order, user.getEmail());
        } else if (decision == ReceptionDecision.PARTIALLY_APPROVED) {
            order.setStatus(MaterialOrderStatus.PARTIALLY_APPROVED);
            addToStock(order, user.getEmail());
        } else {
            order.setStatus(MaterialOrderStatus.DECLINED);
        }

        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        MaterialReception reception = new MaterialReception();
        reception.setId(NanoIdUtils.randomNanoId());
        reception.setMaterialOrderId(order.getId());
        reception.setReceivedBy(user.getEmail());
        reception.setReceivedAt(LocalDateTime.now());
        reception.setDecision(decision);
        reception.setNotes(dto.getNotes());
        reception.setRejectionReason(dto.getRejectionReason());

        MaterialReception saved = receptionRepository.save(reception);

        auditService.log("MaterialReception", saved.getId(), "CREATE", order.getOrganizationId(), null,
                "Reception " + decision + " for order: " + order.getOrderNumber());

        return receptionMapper.toDto(saved);
    }

    public List<ReceptionResponseDTO> getReceptions(String orderId) {
        User user = getCurrentUser();
        orderRepository.findById(orderId).orElseThrow(() -> new NotFoundException("Material order not found"));

        return receptionRepository.findByMaterialOrderId(orderId).stream().map(receptionMapper::toDto).toList();
    }

    // Return
    public MaterialOrderResponseDTO processReturn(String orderId, String itemId, int returnQuantity, String rejectionReason, String notes) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        MaterialOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to process returns for this order");
        }

        MaterialOrderItem item = order.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Order item not found"));

        if (returnQuantity > item.getApprovedQuantity()) {
            throw new BadRequestException("Return quantity exceeds approved quantity");
        }

        item.setApprovedQuantity(item.getApprovedQuantity() - returnQuantity);
        item.setRejectedQuantity(item.getRejectedQuantity() + returnQuantity);
        item.setConditionStatus("returned");
        if (notes != null) item.setNotes(item.getNotes() + " | Return: " + notes);

        order.setTotalApprovedQuantity(order.getTotalApprovedQuantity() - returnQuantity);
        order.setTotalRejectedQuantity(order.getTotalRejectedQuantity() + returnQuantity);

        removeFromStock(item, order.getOrganizationId(), returnQuantity);

        boolean allReturned = order.getItems().stream().allMatch(i -> i.getApprovedQuantity() == 0);
        if (allReturned) {
            order.setStatus(MaterialOrderStatus.RETURNED);
        } else {
            order.setStatus(MaterialOrderStatus.PARTIALLY_APPROVED);
        }

        order.setUpdatedAt(LocalDateTime.now());
        MaterialOrder saved = orderRepository.save(order);

        MaterialReception reception = new MaterialReception();
        reception.setId(NanoIdUtils.randomNanoId());
        reception.setMaterialOrderId(order.getId());
        reception.setReceivedBy(user.getEmail());
        reception.setReceivedAt(LocalDateTime.now());
        reception.setDecision(ReceptionDecision.DECLINED);
        reception.setNotes("Return processed: " + returnQuantity + " " + item.getUnit() + " of " + item.getMaterialName());
        reception.setRejectionReason(rejectionReason);
        receptionRepository.save(reception);

        auditService.log("MaterialOrder", orderId, "RETURN", order.getOrganizationId(), null,
                "Return processed: " + returnQuantity + " of " + item.getMaterialName() + " - Reason: " + rejectionReason);

        MaterialOrderResponseDTO response = orderMapper.toDto(saved);
        enrichSupplierName(response);
        return response;
    }

    private void addToStock(MaterialOrder order, String userEmail) {
        for (MaterialOrderItem item : order.getItems()) {
            if (item.getApprovedQuantity() > 0) {
                List<MaterialStock> existing = materialStockRepository.findByOrganizationId(order.getOrganizationId()).stream()
                        .filter(s -> s.getId().equals(item.getMaterialId()) ||
                                (item.getMaterialName() != null && s.getName().equals(item.getMaterialName())))
                        .toList();

                if (!existing.isEmpty()) {
                    MaterialStock stock = existing.get(0);
                    stock.setQuantity(stock.getQuantity() + item.getApprovedQuantity());
                    stock.setLastUpdatedBy(userEmail);
                    stock.setUpdatedAt(LocalDateTime.now());
                    materialStockRepository.save(stock);
                } else {
                    MaterialStock newStock = new MaterialStock();
                    newStock.setId(NanoIdUtils.randomNanoId());
                    newStock.setName(item.getMaterialName());
                    newStock.setReferenceCode(item.getMaterialReference());
                    newStock.setQuantity(item.getApprovedQuantity());
                    newStock.setMinimumThreshold(0);
                    newStock.setUnit(item.getUnit());
                    newStock.setOrganizationId(order.getOrganizationId());
                    newStock.setCreatedBy(userEmail);
                    newStock.setLastUpdatedBy(userEmail);
                    newStock.setUpdatedAt(LocalDateTime.now());
                    materialStockRepository.save(newStock);
                }
            }
        }
    }

    private void removeFromStock(MaterialOrderItem item, String orgId, int quantity) {
        List<MaterialStock> existing = materialStockRepository.findByOrganizationId(orgId).stream()
                .filter(s -> s.getId().equals(item.getMaterialId()) ||
                        (item.getMaterialName() != null && s.getName().equals(item.getMaterialName())))
                .toList();

        if (!existing.isEmpty()) {
            MaterialStock stock = existing.get(0);
            int newQty = Math.max(0, stock.getQuantity() - quantity);
            stock.setQuantity(newQty);
            stock.setUpdatedAt(LocalDateTime.now());
            materialStockRepository.save(stock);
        }
    }

    private void enrichSupplierName(MaterialOrderResponseDTO response) {
        if (response.getSupplierId() != null) {
            supplierRepository.findById(response.getSupplierId())
                    .ifPresent(s -> response.setSupplierName(s.getCompanyName() != null ? s.getCompanyName() : s.getName()));
        }
    }

    private String generateOrderNumber() {
        return "PO-" + System.currentTimeMillis();
    }

    private User getCurrentUser() {
        Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private void validateAdminOrSubAdmin(User user) {
        if (user.getRole() == null || user.getRole().name().equals("EMPLOYEE") || user.getRole().name().equals("CLIENT")) {
            throw new ForbiddenException("Insufficient permissions");
        }
    }
}
