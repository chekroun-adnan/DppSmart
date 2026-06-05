package com.dppsmart.dppsmart.SupplyChain.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Email.Services.EmailService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.RuleDetectionService;
import com.dppsmart.dppsmart.SecurityAlert.Services.SecurityAnalysisService;
import com.dppsmart.dppsmart.StockMovement.Entities.MovementType;
import com.dppsmart.dppsmart.StockMovement.Services.StockMovementService;
import com.dppsmart.dppsmart.SupplyChain.DTO.*;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrder;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrderItem;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialReception;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialTracking;
import com.dppsmart.dppsmart.SupplyChain.Enums.MaterialOrderStatus;
import com.dppsmart.dppsmart.SupplyChain.Enums.ReceptionDecision;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialOrderRepository;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialReceptionRepository;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialTrackingRepository;
import com.dppsmart.dppsmart.SupplyChain.Repositories.SupplierRepository;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MaterialOrderService {

    private final MaterialOrderRepository orderRepository;
    private final MaterialTrackingRepository trackingRepository;
    private final MaterialReceptionRepository receptionRepository;
    private final SupplierRepository supplierRepository;
    private final MaterialStockRepository materialStockRepository;
    private final SecurityAnalysisService securityAnalysisService;
    private final RuleDetectionService ruleDetectionService;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;
    private final EmailService emailService;
    private final OrdersRepository ordersRepository;
    private final StockMovementService stockMovementService;

    public MaterialOrderResponseDTO createOrder(CreateMaterialOrderDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        if (!permissionService.canAccessOrganization(user, dto.getOrganizationId())) {
            throw new ForbiddenException("Not allowed to use this organization");
        }

        supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new NotFoundException("Supplier not found"));

        MaterialOrder order = new MaterialOrder();
        order.setId(NanoIdUtils.randomNanoId());
        order.setOrderNumber("PO-" + System.currentTimeMillis());
        order.setSupplierId(dto.getSupplierId());
        order.setOrganizationId(dto.getOrganizationId());
        order.setOrderedBy(user.getEmail());
        order.setStatus(MaterialOrderStatus.PENDING);
        if (dto.getExpectedDeliveryDate() != null) {
            order.setExpectedDeliveryDate(LocalDate.parse(dto.getExpectedDeliveryDate()));
        }
        order.setNotes(dto.getNotes());
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        List<MaterialOrderItem> items = new ArrayList<>();
        int totalQty = 0;
        int totalAmount = 0;

        for (CreateMaterialOrderDTO.CreateMaterialOrderItemDTO itemDto : dto.getItems()) {
            MaterialOrderItem item = new MaterialOrderItem();
            item.setId(NanoIdUtils.randomNanoId());
            item.setMaterialId(itemDto.getMaterialId());
            item.setMaterialName(itemDto.getMaterialName());
            item.setMaterialReference(itemDto.getMaterialReference());
            item.setOrderedQuantity(itemDto.getOrderedQuantity());
            item.setReceivedQuantity(0);
            item.setAcceptedQuantity(0);
            item.setRejectedQuantity(0);
            item.setReturnedQuantity(0);
            item.setUnitPrice(itemDto.getUnitPrice() != null ? itemDto.getUnitPrice() : 0);
            item.setUnit(itemDto.getUnit());
            item.setConditionStatus("pending");
            item.setNotes(itemDto.getNotes());
            item.setRemainingQuantity(itemDto.getOrderedQuantity());
            items.add(item);
            totalQty += itemDto.getOrderedQuantity();
            if (itemDto.getUnitPrice() != null) {
                totalAmount += itemDto.getUnitPrice() * itemDto.getOrderedQuantity();
            }
        }

        order.setItems(items);
        order.setTotalOrderedQuantity(totalQty);
        order.setTotalReceivedQuantity(0);
        order.setTotalAcceptedQuantity(0);
        order.setTotalRejectedQuantity(0);
        order.setTotalReturnedQuantity(0);
        order.setTotalAmount(totalAmount);
        order.setDeliveryIds(new ArrayList<>());
        order.setReturnRequestIds(new ArrayList<>());
        order.setDisputeIds(new ArrayList<>());
        order.setDiscussionIds(new ArrayList<>());

        MaterialOrder saved = orderRepository.save(order);

        auditService.log("MaterialOrder", saved.getId(), "CREATE", saved.getOrganizationId(), null,
                "Purchase order created: " + saved.getOrderNumber());

        notificationService.createNotification(user.getId(), "Purchase Order Created",
                "PO " + saved.getOrderNumber() + " has been created",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.DELIVERY,
                "/material-orders/" + saved.getId());

        
        supplierRepository.findById(saved.getSupplierId()).ifPresent(supplier -> {
            List<EmailService.OrderItemSummary> itemSummaries = saved.getItems().stream()
                    .map(i -> new EmailService.OrderItemSummary(i.getMaterialName(), i.getOrderedQuantity(), i.getUnit() != null ? i.getUnit() : ""))
                    .toList();
            String orgName = saved.getOrganizationId();
            emailService.sendSupplierNotification(supplier.getEmail(), saved.getOrderNumber(), orgName, itemSummaries);
            emailService.sendOrderConfirmation(user.getEmail(), saved.getOrderNumber(), supplier.getCompanyName() != null ? supplier.getCompanyName() : supplier.getName(), itemSummaries, orgName);
        });

        MaterialOrderResponseDTO response = toDto(saved);
        enrichSupplierName(response);
        return response;
    }

    public List<MaterialOrderResponseDTO> getAll() {
        User user = getCurrentUser();
        List<MaterialOrderResponseDTO> orders = orderRepository.findAll().stream()
                .filter(o -> permissionService.isAdmin(user) || permissionService.canAccessOrganization(user, o.getOrganizationId()))
                .map(this::toDto)
                .toList();
        orders.forEach(this::enrichSupplierName);
        return orders;
    }

    public List<MaterialOrderResponseDTO> getByOrg(String orgId) {
        User user = getCurrentUser();
        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, orgId)) {
            throw new ForbiddenException("Not allowed to access this organization");
        }
        List<MaterialOrderResponseDTO> orders = orderRepository.findByOrganizationId(orgId).stream()
                .map(this::toDto).toList();
        orders.forEach(this::enrichSupplierName);
        return orders;
    }

    public List<MaterialOrderResponseDTO> getByStatus(String orgId, String status) {
        User user = getCurrentUser();
        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, orgId)) {
            throw new ForbiddenException("Not allowed to access this organization");
        }
        MaterialOrderStatus orderStatus = MaterialOrderStatus.valueOf(status.toUpperCase());
        List<MaterialOrderResponseDTO> orders = orderRepository.findByOrganizationIdAndStatus(orgId, orderStatus).stream()
                .map(this::toDto).toList();
        orders.forEach(this::enrichSupplierName);
        return orders;
    }

    public MaterialOrderResponseDTO getById(String id) {
        User user = getCurrentUser();
        MaterialOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.isAdmin(user) && !permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Not allowed to access this order");
        }

        MaterialOrderResponseDTO response = toDto(order);
        enrichSupplierName(response);
        return response;
    }

    public MaterialOrderResponseDTO updateOrder(String id, UpdateMaterialOrderDTO dto) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        MaterialOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Not allowed to update this order");
        }

        if (dto.getSupplierId() != null) {
            supplierRepository.findById(dto.getSupplierId())
                    .orElseThrow(() -> new NotFoundException("Supplier not found"));
            order.setSupplierId(dto.getSupplierId());
        }
        if (dto.getExpectedDeliveryDate() != null) {
            order.setExpectedDeliveryDate(LocalDate.parse(dto.getExpectedDeliveryDate()));
        }
        if (dto.getNotes() != null) order.setNotes(dto.getNotes());
        if (dto.getStatus() != null) {
            order.setStatus(MaterialOrderStatus.valueOf(dto.getStatus().toUpperCase()));
        }
        if (dto.getShipmentTrackingNumber() != null) order.setShipmentTrackingNumber(dto.getShipmentTrackingNumber());
        if (dto.getShipmentCarrier() != null) order.setShipmentCarrier(dto.getShipmentCarrier());
        if (dto.getInvoiceNumber() != null) order.setInvoiceNumber(dto.getInvoiceNumber());
        if (dto.getInvoiceUrl() != null) order.setInvoiceUrl(dto.getInvoiceUrl());
        if (dto.getDeliveryProofPhotos() != null) order.setDeliveryProofPhotos(dto.getDeliveryProofPhotos());

        order.setUpdatedAt(LocalDateTime.now());
        MaterialOrder saved = orderRepository.save(order);

        auditService.log("MaterialOrder", saved.getId(), "UPDATE", saved.getOrganizationId(), null,
                "Purchase order updated: " + saved.getOrderNumber());

        notificationService.createNotification(user.getId(), "Purchase Order Updated",
                "PO " + saved.getOrderNumber() + " has been updated",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.DELIVERY,
                "/material-orders/" + saved.getId());

        if (dto.getStatus() != null) {
            emailService.sendDeliveryUpdate(saved.getOrderedBy(), saved.getOrderNumber(), saved.getStatus().name(), saved.getShipmentTrackingNumber());
        }

        MaterialOrderResponseDTO response = toDto(saved);
        enrichSupplierName(response);
        return response;
    }

    public MaterialOrderResponseDTO processReturn(String orderId, String itemId, int returnQuantity, String rejectionReason, String notes) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        MaterialOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Not allowed to process returns for this order");
        }

        MaterialOrderItem item = order.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Order item not found"));

        int currentReturned = item.getReturnedQuantity() != null ? item.getReturnedQuantity() : 0;
        if (returnQuantity > (item.getAcceptedQuantity() - currentReturned)) {
            throw new BadRequestException("Return quantity exceeds approved quantity");
        }

        item.setReturnedQuantity(currentReturned + returnQuantity);
        item.setAcceptedQuantity(item.getAcceptedQuantity() - returnQuantity);
        item.setConditionStatus("returned");
        if (notes != null) item.setNotes((item.getNotes() != null ? item.getNotes() + " | " : "") + "Return: " + notes);

        int newTotalReturned = (order.getTotalReturnedQuantity() != null ? order.getTotalReturnedQuantity() : 0) + returnQuantity;
        int newTotalAccepted = (order.getTotalAcceptedQuantity() != null ? order.getTotalAcceptedQuantity() : 0) - returnQuantity;
        order.setTotalReturnedQuantity(newTotalReturned);
        order.setTotalAcceptedQuantity(Math.max(0, newTotalAccepted));

        removeFromStock(item, order.getOrganizationId(), returnQuantity);

        boolean allReturned = order.getItems().stream().allMatch(i -> (i.getReturnedQuantity() != null ? i.getReturnedQuantity() : 0) >= i.getAcceptedQuantity());
        if (allReturned) {
            order.setStatus(MaterialOrderStatus.RETURNED);
        } else {
            order.setStatus(MaterialOrderStatus.PARTIALLY_RECEIVED);
        }

        order.setUpdatedAt(LocalDateTime.now());
        MaterialOrder saved = orderRepository.save(order);

        auditService.log("MaterialOrder", orderId, "RETURN", order.getOrganizationId(), null,
                "Return processed: " + returnQuantity + " of " + item.getMaterialName() + " - Reason: " + rejectionReason);

        notificationService.createNotification(user.getId(), "Return Processed",
                "Return of " + returnQuantity + " " + item.getMaterialName() + " processed for order " + order.getOrderNumber(),
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.DELIVERY,
                "/supply-chain");

        MaterialOrderResponseDTO response = toDto(saved);
        enrichSupplierName(response);
        return response;
    }

    public ReceptionResponseDTO validateReception(CreateReceptionDTO dto) {
        User user = getCurrentUser();

        MaterialOrder order = orderRepository.findById(dto.getMaterialOrderId())
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Not allowed to validate reception for this order");
        }

        ReceptionDecision decision = ReceptionDecision.valueOf(dto.getDecision().toUpperCase());

        int totalAccepted = 0;
        int totalRejected = 0;
        int totalReceived = 0;
        List<StockReceivingResultDTO> receivingResults = new ArrayList<>();

        if (dto.getItemDecisions() != null) {
            for (CreateReceptionDTO.ItemReceptionDTO itemDecision : dto.getItemDecisions()) {
                MaterialOrderItem item = order.getItems().stream()
                        .filter(i -> i.getId().equals(itemDecision.getItemId()))
                        .findFirst()
                        .orElseThrow(() -> new NotFoundException("Order item not found: " + itemDecision.getItemId()));

                int received = itemDecision.getReceivedQuantity() != null ? itemDecision.getReceivedQuantity() : 0;
                int approved = itemDecision.getApprovedQuantity() != null ? itemDecision.getApprovedQuantity() : 0;
                int rejected = itemDecision.getRejectedQuantity() != null ? itemDecision.getRejectedQuantity() : 0;

                if (received <= 0) continue;
                if (approved + rejected > received) {
                    throw new BadRequestException("Approved + rejected exceeds received quantity for: " + item.getMaterialName());
                }

                item.setReceivedQuantity((item.getReceivedQuantity() != null ? item.getReceivedQuantity() : 0) + received);
                item.setAcceptedQuantity((item.getAcceptedQuantity() != null ? item.getAcceptedQuantity() : 0) + approved);
                item.setRejectedQuantity((item.getRejectedQuantity() != null ? item.getRejectedQuantity() : 0) + rejected);
                item.setRemainingQuantity(Math.max(0, item.getOrderedQuantity() - item.getAcceptedQuantity()));
                if (itemDecision.getConditionStatus() != null) item.setConditionStatus(itemDecision.getConditionStatus());
                if (itemDecision.getNotes() != null) item.setNotes(itemDecision.getNotes());

                if (approved > 0) {
                    StockReceivingResultDTO result = addToStock(item, order.getOrganizationId(), approved, order.getId(), user.getEmail());
                    receivingResults.add(result);
                }

                totalAccepted += approved;
                totalRejected += rejected;
                totalReceived += received;
            }
        }

        order.setTotalReceivedQuantity((order.getTotalReceivedQuantity() != null ? order.getTotalReceivedQuantity() : 0) + totalReceived);
        order.setTotalAcceptedQuantity((order.getTotalAcceptedQuantity() != null ? order.getTotalAcceptedQuantity() : 0) + totalAccepted);
        order.setTotalRejectedQuantity((order.getTotalRejectedQuantity() != null ? order.getTotalRejectedQuantity() : 0) + totalRejected);
        order.setReceivedAt(LocalDateTime.now());

        boolean allFullyReceived = order.getItems().stream()
                .allMatch(i -> {
                    int received = i.getReceivedQuantity() != null ? i.getReceivedQuantity() : 0;
                    int ordered = i.getOrderedQuantity() != null ? i.getOrderedQuantity() : 0;
                    return received >= ordered;
                });
        boolean anyReceived = order.getItems().stream()
                .anyMatch(i -> (i.getReceivedQuantity() != null ? i.getReceivedQuantity() : 0) > 0);

        if (totalRejected > 0 && totalAccepted > 0) {
            order.setStatus(MaterialOrderStatus.PARTIALLY_RECEIVED);
        } else if (totalRejected > 0 && totalAccepted == 0) {
            order.setStatus(MaterialOrderStatus.DISPUTED);
        } else if (allFullyReceived && totalRejected == 0) {
            order.setStatus(MaterialOrderStatus.RECEIVED);
        } else if (anyReceived) {
            order.setStatus(MaterialOrderStatus.PARTIALLY_RECEIVED);
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
        receptionRepository.save(reception);

        auditService.log("MaterialReception", reception.getId(), "CREATE", order.getOrganizationId(), null,
                "Reception " + decision + " for order: " + order.getOrderNumber() + " | Received: " + totalReceived + " | Accepted: " + totalAccepted + " | Rejected: " + totalRejected);

        notificationService.createNotification(user.getId(), "Reception Validated",
                "Order " + order.getOrderNumber() + " — Received: " + totalReceived + ", Accepted: " + totalAccepted + ", Rejected: " + totalRejected,
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.DELIVERY,
                "/supply-chain");

        
        if (totalRejected > 0) {
            final int finalTotalRejected = totalRejected;
            supplierRepository.findById(order.getSupplierId()).ifPresent(supplier -> {
                List<EmailService.MismatchItem> mismatches = order.getItems().stream()
                        .filter(i -> i.getRejectedQuantity() != null && i.getRejectedQuantity() > 0)
                        .map(i -> new EmailService.MismatchItem(
                                i.getMaterialName(),
                                i.getOrderedQuantity() != null ? i.getOrderedQuantity() : 0,
                                i.getReceivedQuantity() != null ? i.getReceivedQuantity() : 0,
                                i.getRejectedQuantity()))
                        .toList();
                emailService.sendMismatchAlert(supplier.getEmail(), order.getOrderNumber(), mismatches, decision.name());
            });
        }

        if (totalRejected > 0) {
            var supplierAlert = ruleDetectionService.detectSupplierAnomaly(
                    order.getId(), order.getSupplierId(),
                    totalReceived, totalAccepted, false, totalRejected,
                    order.getOrganizationId());
            if (supplierAlert != null) {
                securityAnalysisService.analyzeAndAlert(supplierAlert);
            }
        }

        ReceptionResponseDTO responseDto = new ReceptionResponseDTO();
        responseDto.setId(reception.getId());
        responseDto.setMaterialOrderId(reception.getMaterialOrderId());
        responseDto.setReceivedBy(reception.getReceivedBy());
        responseDto.setReceivedAt(reception.getReceivedAt());
        responseDto.setDecision(reception.getDecision() != null ? reception.getDecision().name() : null);
        responseDto.setNotes(reception.getNotes());
        responseDto.setRejectionReason(reception.getRejectionReason());
        responseDto.setStockResults(receivingResults);
        return responseDto;
    }

    public List<ReceptionResponseDTO> getReceptions(String orderId) {
        User user = getCurrentUser();
        orderRepository.findById(orderId).orElseThrow(() -> new NotFoundException("Order not found"));
        return receptionRepository.findByMaterialOrderId(orderId).stream().map(r -> {
            ReceptionResponseDTO dto = new ReceptionResponseDTO();
            dto.setId(r.getId());
            dto.setMaterialOrderId(r.getMaterialOrderId());
            dto.setReceivedBy(r.getReceivedBy());
            dto.setReceivedAt(r.getReceivedAt());
            dto.setDecision(r.getDecision() != null ? r.getDecision().name() : null);
            dto.setNotes(r.getNotes());
            dto.setRejectionReason(r.getRejectionReason());
            return dto;
        }).toList();
    }

    
    private String normalizeMaterialName(String name) {
        if (name == null) return "";
        String normalized = Normalizer.normalize(name.trim().toLowerCase(), Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{M}", "");
        normalized = normalized.replaceAll("\\s+", " ");
        return normalized;
    }

    
    private Optional<StockMatch> findStockMatch(MaterialOrderItem item, String orgId) {
        List<MaterialStock> orgStocks = materialStockRepository.findByOrganizationId(orgId);
        String unit = item.getUnit() != null ? item.getUnit().trim().toLowerCase() : "";

        if (item.getMaterialId() != null && !item.getMaterialId().isBlank()) {
            for (MaterialStock s : orgStocks) {
                String sUnit = s.getUnit() != null ? s.getUnit().trim().toLowerCase() : "";
                if (s.getId().equals(item.getMaterialId()) && unit.equals(sUnit)) {
                    return Optional.of(new StockMatch(s, StockReceivingResultDTO.MatchedBy.MATERIAL_ID));
                }
            }
        }

        String normName = normalizeMaterialName(item.getMaterialName());
        if (!normName.isBlank()) {
            for (MaterialStock s : orgStocks) {
                String sUnit = s.getUnit() != null ? s.getUnit().trim().toLowerCase() : "";
                if (normalizeMaterialName(s.getName()).equals(normName) && unit.equals(sUnit)) {
                    return Optional.of(new StockMatch(s, StockReceivingResultDTO.MatchedBy.MATERIAL_NAME_UNIT));
                }
            }
        }

        if (item.getMaterialReference() != null && !item.getMaterialReference().isBlank()) {
            for (MaterialStock s : orgStocks) {
                String sUnit = s.getUnit() != null ? s.getUnit().trim().toLowerCase() : "";
                if (item.getMaterialReference().equalsIgnoreCase(s.getReferenceCode()) && unit.equals(sUnit)) {
                    return Optional.of(new StockMatch(s, StockReceivingResultDTO.MatchedBy.REFERENCE_CODE));
                }

                if (s.getAlternativeRefCodes() != null && unit.equals(sUnit)) {
                    boolean altMatch = s.getAlternativeRefCodes().stream()
                            .anyMatch(alt -> alt.equalsIgnoreCase(item.getMaterialReference()));
                    if (altMatch) return Optional.of(new StockMatch(s, StockReceivingResultDTO.MatchedBy.REFERENCE_CODE));
                }
            }
        }

        return Optional.empty();
    }

    private record StockMatch(MaterialStock stock, StockReceivingResultDTO.MatchedBy matchedBy) {}

    private StockReceivingResultDTO addToStock(MaterialOrderItem item, String orgId, int acceptedQty,
                                               String orderId, String createdBy) {
        if (acceptedQty <= 0) return null;

        Optional<StockMatch> match = findStockMatch(item, orgId);

        if (match.isPresent()) {
            MaterialStock stock = match.get().stock();
            StockReceivingResultDTO.MatchedBy matchedBy = match.get().matchedBy();

            int previousQty = stock.getQuantity() != null ? stock.getQuantity() : 0;
            int newQty = previousQty + acceptedQty;

            stock.setQuantity(newQty);
            stock.setUpdatedAt(LocalDateTime.now());

            String receivedRef = item.getMaterialReference();
            if (receivedRef != null && !receivedRef.isBlank()
                    && !receivedRef.equalsIgnoreCase(stock.getReferenceCode())) {
                if (stock.getAlternativeRefCodes() == null) stock.setAlternativeRefCodes(new ArrayList<>());
                boolean alreadyStored = stock.getAlternativeRefCodes().stream()
                        .anyMatch(r -> r.equalsIgnoreCase(receivedRef));
                if (!alreadyStored) stock.getAlternativeRefCodes().add(receivedRef);
            }

            materialStockRepository.save(stock);

            stockMovementService.recordMaterialMovement(
                    MovementType.MATERIAL_RECEIVED, stock.getId(), stock.getName(),
                    stock.getUnit(), acceptedQty, previousQty, newQty,
                    orderId, null, orgId, createdBy);

            log.info("STOCK RECEIVE: merged {} +{} (matched by {}) → qty {} → {}",
                    stock.getName(), acceptedQty, matchedBy, previousQty, newQty);

            return StockReceivingResultDTO.builder()
                    .action(StockReceivingResultDTO.Action.UPDATED_EXISTING_STOCK)
                    .matchedBy(matchedBy)
                    .stockId(stock.getId())
                    .materialName(stock.getName())
                    .receivedQuantity(acceptedQty)
                    .previousQuantity(previousQty)
                    .newQuantity(newQty)
                    .primaryReferenceCode(stock.getReferenceCode())
                    .receivedReferenceCode(receivedRef)
                    .alternativeRefCodes(stock.getAlternativeRefCodes())
                    .build();
        } else {

            MaterialStock newStock = new MaterialStock();
            newStock.setId(NanoIdUtils.randomNanoId());
            newStock.setName(item.getMaterialName());
            newStock.setReferenceCode(item.getMaterialReference());
            newStock.setQuantity(acceptedQty);
            newStock.setMinimumThreshold(0);
            newStock.setUnit(item.getUnit());
            newStock.setOrganizationId(orgId);
            newStock.setCreatedBy(createdBy);
            newStock.setLastUpdatedBy(createdBy);
            newStock.setUpdatedAt(LocalDateTime.now());
            newStock.setAlternativeRefCodes(new ArrayList<>());
            materialStockRepository.save(newStock);

            stockMovementService.recordMaterialMovement(
                    MovementType.MATERIAL_RECEIVED, newStock.getId(), newStock.getName(),
                    newStock.getUnit(), acceptedQty, 0, acceptedQty,
                    orderId, null, orgId, createdBy);

            log.info("STOCK RECEIVE: created new stock {} qty={} ref={}",
                    newStock.getName(), acceptedQty, newStock.getReferenceCode());

            return StockReceivingResultDTO.builder()
                    .action(StockReceivingResultDTO.Action.CREATED_NEW_STOCK)
                    .matchedBy(StockReceivingResultDTO.MatchedBy.NO_MATCH)
                    .stockId(newStock.getId())
                    .materialName(newStock.getName())
                    .receivedQuantity(acceptedQty)
                    .previousQuantity(0)
                    .newQuantity(acceptedQty)
                    .primaryReferenceCode(newStock.getReferenceCode())
                    .receivedReferenceCode(newStock.getReferenceCode())
                    .alternativeRefCodes(new ArrayList<>())
                    .build();
        }
    }

    public void deleteOrder(String id) {
        User user = getCurrentUser();
        validateAdminOrSubAdmin(user);

        MaterialOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Not allowed to delete this order");
        }

        orderRepository.delete(order);

        auditService.log("MaterialOrder", id, "DELETE", order.getOrganizationId(), null,
                "Purchase order deleted: " + order.getOrderNumber());

        notificationService.createNotification(user.getId(), "Purchase Order Deleted",
                "PO " + order.getOrderNumber() + " has been deleted",
                com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType.DELIVERY,
                "/material-orders");
    }

    private void removeFromStock(MaterialOrderItem item, String orgId, int quantity) {
        findStockMatch(item, orgId).ifPresent(match -> {
            MaterialStock stock = match.stock();
            int prev = stock.getQuantity() != null ? stock.getQuantity() : 0;
            stock.setQuantity(Math.max(0, prev - quantity));
            stock.setUpdatedAt(LocalDateTime.now());
            materialStockRepository.save(stock);
        });
    }

    public TrackingResponseDTO updateTracking(String orderId, CreateTrackingDTO dto) {
        User user = getCurrentUser();
        MaterialOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Material order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Not allowed to update tracking for this order");
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

        auditService.log("MaterialTracking", saved.getId(), "UPDATE", order.getOrganizationId(), null,
                "Tracking updated for order: " + order.getOrderNumber());

        return toTrackingDto(saved);
    }

    public List<TrackingResponseDTO> getTrackingHistory(String orderId) {
        User user = getCurrentUser();
        orderRepository.findById(orderId).orElseThrow(() -> new NotFoundException("Material order not found"));
        return trackingRepository.findByMaterialOrderId(orderId).stream().map(this::toTrackingDto).toList();
    }

    private TrackingResponseDTO toTrackingDto(MaterialTracking t) {
        TrackingResponseDTO dto = new TrackingResponseDTO();
        dto.setId(t.getId());
        dto.setMaterialOrderId(t.getMaterialOrderId());
        dto.setCurrentLatitude(t.getCurrentLatitude());
        dto.setCurrentLongitude(t.getCurrentLongitude());
        dto.setCurrentStatus(t.getCurrentStatus());
        dto.setEstimatedArrival(t.getEstimatedArrival());
        dto.setLastUpdatedAt(t.getLastUpdatedAt());
        return dto;
    }

    private MaterialOrderResponseDTO toDto(MaterialOrder order) {
        MaterialOrderResponseDTO dto = new MaterialOrderResponseDTO();
        dto.setId(order.getId());
        dto.setOrderNumber(order.getOrderNumber());
        dto.setSupplierId(order.getSupplierId());
        dto.setOrganizationId(order.getOrganizationId());
        dto.setOrderedBy(order.getOrderedBy());
        dto.setStatus(order.getStatus() != null ? order.getStatus().name() : null);
        dto.setExpectedDeliveryDate(order.getExpectedDeliveryDate());
        dto.setShippedAt(order.getShippedAt());
        dto.setReceivedAt(order.getReceivedAt());
        dto.setNotes(order.getNotes());
        dto.setTotalOrderedQuantity(order.getTotalOrderedQuantity());
        dto.setTotalReceivedQuantity(order.getTotalReceivedQuantity());
        dto.setTotalAcceptedQuantity(order.getTotalAcceptedQuantity());
        dto.setTotalRejectedQuantity(order.getTotalRejectedQuantity());
        dto.setTotalReturnedQuantity(order.getTotalReturnedQuantity());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setShipmentTrackingNumber(order.getShipmentTrackingNumber());
        dto.setShipmentCarrier(order.getShipmentCarrier());
        dto.setInvoiceNumber(order.getInvoiceNumber());
        dto.setInvoiceUrl(order.getInvoiceUrl());
        dto.setDeliveryProofPhotos(order.getDeliveryProofPhotos());
        dto.setSourceClientOrderId(order.getSourceClientOrderId());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setUpdatedAt(order.getUpdatedAt());
        dto.setDeliveryIds(order.getDeliveryIds());
        dto.setReturnRequestIds(order.getReturnRequestIds());
        dto.setDisputeIds(order.getDisputeIds());
        dto.setDiscussionIds(order.getDiscussionIds());

        if (order.getItems() != null) {
            dto.setItems(order.getItems().stream().map(this::toItemDto).toList());
        }

        return dto;
    }

    private MaterialOrderResponseDTO.MaterialOrderItemDTO toItemDto(MaterialOrderItem item) {
        MaterialOrderResponseDTO.MaterialOrderItemDTO dto = new MaterialOrderResponseDTO.MaterialOrderItemDTO();
        dto.setId(item.getId());
        dto.setMaterialId(item.getMaterialId());
        dto.setMaterialName(item.getMaterialName());
        dto.setMaterialReference(item.getMaterialReference());
        dto.setOrderedQuantity(item.getOrderedQuantity());
        dto.setReceivedQuantity(item.getReceivedQuantity());
        dto.setAcceptedQuantity(item.getAcceptedQuantity());
        dto.setRejectedQuantity(item.getRejectedQuantity());
        dto.setReturnedQuantity(item.getReturnedQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setUnit(item.getUnit());
        dto.setConditionStatus(item.getConditionStatus());
        dto.setNotes(item.getNotes());
        dto.setRemainingQuantity(item.getRemainingQuantity());
        return dto;
    }

    private void enrichSupplierName(MaterialOrderResponseDTO response) {
        if (response.getSupplierId() != null) {
            supplierRepository.findById(response.getSupplierId())
                    .ifPresent(s -> response.setSupplierName(s.getCompanyName() != null ? s.getCompanyName() : s.getName()));
        }
    }

    private void validateAdminOrSubAdmin(User user) {
        if (user.getRole() == null || user.getRole().name().equals("EMPLOYEE") || user.getRole().name().equals("CLIENT")) {
            throw new ForbiddenException("Insufficient permissions");
        }
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}