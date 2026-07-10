package com.dppsmart.dppsmart.Billing.Services;

import com.dppsmart.dppsmart.Billing.DTO.InvoiceDto;
import com.dppsmart.dppsmart.Billing.DTO.InvoiceLineItemDto;
import com.dppsmart.dppsmart.Billing.DTO.PaymentDto;
import com.dppsmart.dppsmart.Billing.DTO.RecordPaymentDto;
import com.dppsmart.dppsmart.Billing.Entities.Invoice;
import com.dppsmart.dppsmart.Billing.Entities.InvoiceLineItem;
import com.dppsmart.dppsmart.Billing.Entities.Payment;
import com.dppsmart.dppsmart.Billing.Entities.Quote;
import com.dppsmart.dppsmart.Billing.Enums.InvoiceStatus;
import com.dppsmart.dppsmart.Billing.Repositories.InvoiceRepository;
import com.dppsmart.dppsmart.Billing.Repositories.PaymentRepository;
import com.dppsmart.dppsmart.Billing.Repositories.QuoteRepository;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Orders.Entities.ManufacturingMode;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepEntity;
import com.dppsmart.dppsmart.Production.Repositories.ProductionStepEntityRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class InvoiceService {

    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private QuoteRepository quoteRepository;
    @Autowired private OrdersRepository ordersRepository;
    @Autowired private ProductionStepEntityRepository stepRepository;
    @Autowired private InvoiceNumberGenerator numberGenerator;
    @Autowired private InvoicePdfGenerator pdfGenerator;
    @Autowired private PermissionService permissionService;
    @Autowired private CostCalculationService costCalculationService;
    @Autowired private com.dppsmart.dppsmart.Expedition.Repositories.ExpeditionRepository expeditionRepository;
    @Autowired private com.dppsmart.dppsmart.Expedition.Repositories.PackageBoxRepository packageBoxRepository;

    public List<InvoiceDto> getInvoices(String organizationId, String clientId, String status) {
        List<Invoice> invoices;
        if (clientId != null) {
            invoices = invoiceRepository.findByClientIdOrderByCreatedAtDesc(clientId);
        } else if (status != null) {
            if ("ACTIVE".equalsIgnoreCase(status)) {
                if (organizationId == null) {
                    invoices = invoiceRepository.findAll().stream()
                            .filter(i -> i.getStatus() != InvoiceStatus.PAID && i.getStatus() != InvoiceStatus.CANCELLED)
                            .sorted(java.util.Comparator.comparing(Invoice::getCreatedAt, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())).reversed())
                            .collect(Collectors.toList());
                } else {
                    invoices = invoiceRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId).stream()
                            .filter(i -> i.getStatus() != InvoiceStatus.PAID && i.getStatus() != InvoiceStatus.CANCELLED)
                            .collect(Collectors.toList());
                }
            } else {
                try {
                    InvoiceStatus is = InvoiceStatus.valueOf(status.toUpperCase());
                    if (organizationId == null) {
                        invoices = invoiceRepository.findByStatus(is).stream()
                                .sorted(java.util.Comparator.comparing(Invoice::getCreatedAt, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())).reversed())
                                .collect(Collectors.toList());
                    } else {
                        invoices = invoiceRepository.findByOrganizationIdAndStatusOrderByCreatedAtDesc(organizationId, is);
                    }
                } catch (IllegalArgumentException e) {
                    invoices = organizationId == null
                            ? invoiceRepository.findAll().stream()
                                .sorted(java.util.Comparator.comparing(Invoice::getCreatedAt, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())).reversed())
                                .collect(Collectors.toList())
                            : invoiceRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId);
                }
            }
        } else {
            invoices = organizationId == null
                    ? invoiceRepository.findAll().stream()
                        .sorted(java.util.Comparator.comparing(Invoice::getCreatedAt, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())).reversed())
                        .collect(Collectors.toList())
                    : invoiceRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId);
        }
        return invoices.stream().map(inv -> {
            if (enrichInvoiceCostsFromOrder(inv)) {
                recalculateInvoiceTotals(inv);
                Invoice saved = invoiceRepository.save(inv);
                generateAndStorePdf(saved);
                return toDto(saved);
            }
            return toDto(inv);
        }).collect(Collectors.toList());
    }

    public List<InvoiceDto> getClientInvoices(String clientId) {
        return invoiceRepository.findByClientIdOrderByCreatedAtDesc(clientId).stream()
                .map(inv -> {
                    if (enrichInvoiceCostsFromOrder(inv)) {
                        recalculateInvoiceTotals(inv);
                        Invoice saved = invoiceRepository.save(inv);
                        generateAndStorePdf(saved);
                        return toDto(saved);
                    }
                    return toDto(inv);
                }).collect(Collectors.toList());
    }

    public void recalculateAllInvoices() {
        List<Invoice> invoices = invoiceRepository.findAll();
        for (Invoice invoice : invoices) {
            boolean needsUpdate = false;
            if (invoice.getOrderId() != null) {
                Optional<Orders> orderOpt = ordersRepository.findById(invoice.getOrderId());
                if (orderOpt.isPresent()) {
                    Orders order = orderOpt.get();
                    ManufacturingMode mode = order.getManufacturingMode() != null
                            ? order.getManufacturingMode() : ManufacturingMode.FULL_MANUFACTURING;
                    boolean isClientSupplied = mode == ManufacturingMode.CLIENT_SUPPLIED_MATERIALS;
                    CostBreakdown breakdown = buildCostLineItemsFromOrder(order, isClientSupplied, true);
                    if (!breakdown.items().isEmpty()) {
                        invoice.setItems(breakdown.items());
                        invoice.setTotalMaterialCost(breakdown.totalMaterialCost());
                        invoice.setTotalProductionCost(breakdown.totalProductionCost());
                        invoice.setManufacturingMode(mode.name());
                        needsUpdate = true;
                    }
                }
            }
            if (needsUpdate) {
                recalculateInvoiceTotals(invoice);
                Invoice saved = invoiceRepository.save(invoice);
                generateAndStorePdf(saved);
            }
        }
    }

    public InvoiceDto getInvoice(String id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Invoice not found: " + id));
        if (enrichInvoiceCostsFromOrder(invoice)) {
            recalculateInvoiceTotals(invoice);
            invoice = invoiceRepository.save(invoice);
            generateAndStorePdf(invoice);
        }
        return toDto(invoice);
    }

    public InvoiceDto setManualBoxes(String id, Integer manualBoxes) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Invoice not found: " + id));
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Cannot override boxes for a finalized invoice.");
        }
        invoice.setManualTotalBoxes(manualBoxes);
        invoice = invoiceRepository.save(invoice);
        return toDto(invoice);
    }

    public InvoiceDto createInvoiceFromQuote(String quoteId, User user) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new NotFoundException("Quote not found: " + quoteId));

        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(numberGenerator.generateInvoiceNumber(user.getOrganizationId()));
        invoice.setOrderId(quote.getOrderId());
        invoice.setQuoteId(quoteId);
        invoice.setClientId(quote.getClientId());
        invoice.setOrganizationId(user.getOrganizationId());
        invoice.setSubtotal(quote.getSubtotal());
        invoice.setTaxRate(quote.getTaxRate());
        invoice.setTaxAmount(quote.getTaxAmount());
        invoice.setDiscountPercent(quote.getDiscountPercent());
        invoice.setDiscountAmount(quote.getDiscountAmount());
        invoice.setTotal(quote.getTotal());
        invoice.setAmountPaid(0.0);
        invoice.setCurrency(quote.getCurrency() != null ? quote.getCurrency() : "MAD");
        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(30));
        invoice.setNotes(quote.getNotes());
        invoice.setCreatedBy(user.getEmail());
        invoice.setCreatedAt(LocalDateTime.now());

        if (quote.getOrderId() != null) {
            Optional<Orders> orderOpt = ordersRepository.findById(quote.getOrderId());
            if (orderOpt.isPresent()) {
                Orders order = orderOpt.get();
                ManufacturingMode mode = order.getManufacturingMode() != null
                        ? order.getManufacturingMode() : ManufacturingMode.FULL_MANUFACTURING;
                CostBreakdown breakdown = buildCostLineItemsFromOrder(order, mode == ManufacturingMode.CLIENT_SUPPLIED_MATERIALS, true);
                if (!breakdown.items().isEmpty()) {
                    invoice.setItems(breakdown.items());
                    invoice.setTotalMaterialCost(breakdown.totalMaterialCost());
                    invoice.setTotalProductionCost(breakdown.totalProductionCost());
                    invoice.setManufacturingMode(mode.name());
                    if (breakdown.subtotal() > 0) {
                        invoice.setSubtotal(breakdown.subtotal());
                        double discountPct = invoice.getDiscountPercent() != null ? invoice.getDiscountPercent() : 0;
                        double taxRate = invoice.getTaxRate() != null ? invoice.getTaxRate() : 0;
                        double discountAmount = breakdown.subtotal() * (discountPct / 100);
                        double taxAmount = (breakdown.subtotal() - discountAmount) * (taxRate / 100);
                        invoice.setDiscountAmount(discountAmount);
                        invoice.setTaxAmount(taxAmount);
                        invoice.setTotal(breakdown.subtotal() - discountAmount + taxAmount);
                    }
                }
            }
        }

        if (invoice.getItems() == null || invoice.getItems().isEmpty()) {
            if (quote.getItems() != null) {
                invoice.setItems(quote.getItems().stream().map(qi -> {
                    InvoiceLineItem li = new InvoiceLineItem();
                    li.setProductId(qi.getProductId());
                    li.setProductName(qi.getProductName());
                    li.setItemType("PRODUCT");
                    li.setQuantity(qi.getQuantity() != null ? qi.getQuantity().doubleValue() : null);
                    li.setUnitPrice(qi.getUnitPrice());
                    li.setTotalPrice(qi.getTotalPrice());
                    return li;
                }).collect(Collectors.toList()));
            }
        }

        invoice = invoiceRepository.save(invoice);
        generateAndStorePdf(invoice);
        return toDto(invoice);
    }

    public InvoiceDto createInvoiceFromOrder(String orderId, User user) {
        return createInvoiceFromOrder(orderId, null, user);
    }

    public InvoiceDto createInvoiceFromOrder(String orderId, ManufacturingMode manufacturingMode, User user) {
        return createInvoiceInternal(orderId, manufacturingMode, user != null ? user.getEmail() : "SYSTEM", user != null ? user.getOrganizationId() : null);
    }

    public InvoiceDto createInvoiceFromOrderSystem(String orderId) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
        if (order.getInvoiceId() != null) {
            return getInvoice(order.getInvoiceId()); // Already invoiced
        }
        return createInvoiceInternal(orderId, null, "SYSTEM", order.getOrganizationId());
    }

    private InvoiceDto createInvoiceInternal(String orderId, ManufacturingMode manufacturingMode, String creatorEmail, String orgId) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
        if (order.getStatus() == ClientOrderStatus.CANCELLED || order.getStatus() == ClientOrderStatus.REJECTED) {
            throw new BadRequestException("Cannot create invoice for a " + order.getStatus() + " order");
        }

        ManufacturingMode mode = manufacturingMode != null ? manufacturingMode
                : (order.getManufacturingMode() != null ? order.getManufacturingMode() : ManufacturingMode.FULL_MANUFACTURING);
        order.setManufacturingMode(mode);
        ordersRepository.save(order);

        boolean isClientSupplied = mode == ManufacturingMode.CLIENT_SUPPLIED_MATERIALS;
        String currency = order.getCurrency() != null ? order.getCurrency() : "MAD";

        // Generate invoice number based on the order's orgId
        String number = numberGenerator.generateInvoiceNumber(order.getOrganizationId());

        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(number);
        invoice.setOrderId(orderId);
        invoice.setClientId(order.getClientId());
        invoice.setOrganizationId(order.getOrganizationId());
        invoice.setManufacturingMode(mode.name());
        invoice.setAmountPaid(0.0);
        invoice.setCurrency(currency);
        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(30));
        invoice.setCreatedBy(creatorEmail);
        invoice.setCreatedAt(LocalDateTime.now());

        CostBreakdown breakdown = buildCostLineItemsFromOrder(order, isClientSupplied, true);

        invoice.setItems(breakdown.items());
        double subtotal = breakdown.subtotal();
        invoice.setSubtotal(subtotal);
        invoice.setTotalProductionCost(breakdown.totalProductionCost());
        invoice.setTotalMaterialCost(breakdown.totalMaterialCost());

        double taxRate = 0.0;
        invoice.setTaxRate(taxRate);
        invoice.setTaxAmount(0.0);
        invoice.setDiscountPercent(0.0);
        invoice.setDiscountAmount(0.0);
        invoice.setTotal(subtotal);

        invoice = invoiceRepository.save(invoice);

        order.setInvoiceId(invoice.getId());
        order.setBillingStatus("INVOICED");
        order.setSubtotal(subtotal);
        order.setTotalPrice(subtotal);
        ordersRepository.save(order);

        generateAndStorePdf(invoice);
        return toDto(invoice);
    }

    public InvoiceDto sendInvoice(String id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Invoice not found: " + id));
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new BadRequestException("Only draft invoices can be sent.");
        }
        invoice.setStatus(InvoiceStatus.SENT);
        invoice.setSentAt(LocalDateTime.now());
        if (invoice.getDueDate() == null) {
            invoice.setDueDate(LocalDate.now().plusDays(30));
        }
        if (enrichInvoiceCostsFromOrder(invoice)) {
            recalculateInvoiceTotals(invoice);
        }
        snapshotShippingInformation(invoice);
        invoiceRepository.save(invoice);
        generateAndStorePdf(invoice);
        return toDto(invoice);
    }

    public InvoiceDto recordPayment(String invoiceId, RecordPaymentDto dto, User user) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new NotFoundException("Invoice not found: " + invoiceId));

        Payment payment = new Payment();
        payment.setInvoiceId(invoiceId);
        payment.setAmount(dto.getAmount());
        payment.setPaymentMethod(dto.getPaymentMethod());
        payment.setReferenceNumber(dto.getReference());
        payment.setNotes(dto.getNotes());
        payment.setCreatedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        double totalPaid = (invoice.getAmountPaid() != null ? invoice.getAmountPaid() : 0) + dto.getAmount();
        invoice.setAmountPaid(totalPaid);

        if (totalPaid >= invoice.getTotal()) {
            if (invoice.getStatus() == InvoiceStatus.DRAFT) {
                snapshotShippingInformation(invoice);
            }
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidDate(LocalDate.now());
        } else {
            if (invoice.getStatus() == InvoiceStatus.DRAFT) {
                snapshotShippingInformation(invoice);
            }
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }

        invoiceRepository.save(invoice);
        generateAndStorePdf(invoice);
        return toDto(invoice);
    }

    public ResponseEntity<byte[]> downloadPdf(String id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Invoice not found: " + id));

        boolean regenerated = false;
        if (enrichInvoiceCostsFromOrder(invoice)) {
            recalculateInvoiceTotals(invoice);
            regenerated = true;
        }
        
        if (invoice.getStatus() == com.dppsmart.dppsmart.Billing.Enums.InvoiceStatus.DRAFT) {
            regenerated = true;
        }

        byte[] pdfData = invoice.getPdfData();
        if (regenerated || pdfData == null || pdfData.length == 0) {
            Orders order = invoice.getOrderId() != null
                    ? ordersRepository.findById(invoice.getOrderId()).orElse(null) : null;
            InvoiceDto dto = toDto(invoice);
            pdfData = pdfGenerator.generatePdf(dto, "SmartTex", "",
                    order != null ? order.getClientId() : "", "");
            invoice.setPdfData(pdfData);
            invoiceRepository.save(invoice);
        }

        String filename = "invoice-" + (invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : id) + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfData);
    }

    public List<PaymentDto> getPayments(String invoiceId) {
        return paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(invoiceId).stream()
                .map(this::toPaymentDto).collect(Collectors.toList());
    }

    public InvoiceDto cancelInvoice(String id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Invoice not found: " + id));
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BadRequestException("Cannot cancel a paid invoice.");
        }
        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setCancelledAt(LocalDateTime.now());
        invoiceRepository.save(invoice);
        return toDto(invoice);
    }

    public InvoiceDto updateInvoice(String id, InvoiceDto dto, User user) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Invoice not found: " + id));
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new BadRequestException("Only draft invoices can be edited.");
        }

        if (dto.getTaxRate() != null) invoice.setTaxRate(dto.getTaxRate());
        if (dto.getDiscountPercent() != null) invoice.setDiscountPercent(dto.getDiscountPercent());
        if (dto.getNotes() != null) invoice.setNotes(dto.getNotes());

        enrichInvoiceCostsFromOrder(invoice);
        recalculateInvoiceTotals(invoice);
        invoice.setUpdatedAt(LocalDateTime.now());

        invoice = invoiceRepository.save(invoice);
        generateAndStorePdf(invoice);
        return toDto(invoice);
    }

    private record CostBreakdown(
            List<InvoiceLineItem> items,
            double totalMaterialCost,
            double totalProductionCost,
            double subtotal
    ) {}

    private CostBreakdown buildCostLineItemsFromOrder(Orders order, boolean isClientSupplied) {
        return buildCostLineItemsFromOrder(order, isClientSupplied, true);
    }

    private CostBreakdown buildCostLineItemsFromOrder(Orders order, boolean isClientSupplied, boolean forceLive) {
        List<InvoiceLineItem> items = new ArrayList<>();
        double totalMaterialCost = 0;
        double totalProductionCost = 0;
        
        List<String> missingMaterials = new ArrayList<>();
        List<String> missingOperations = new ArrayList<>();

        if (order.getItems() != null) {
            for (com.dppsmart.dppsmart.Orders.Entities.OrderItem orderItem : order.getItems()) {
                CostCalculationService.OrderCostBreakdown itemBreakdown =
                        costCalculationService.calculateOrderCostBreakdown(orderItem.getProductId(), orderItem.getQuantity(), order.getOrganizationId());

                if (!isClientSupplied && itemBreakdown.hasMaterialSheet()) {
                    for (com.dppsmart.dppsmart.Orders.Entities.MaterialCostLineSnapshot matLine : itemBreakdown.materialLines()) {
                        if (matLine.getUnitPrice() == null || matLine.getUnitPrice() <= 0) {
                            missingMaterials.add(matLine.getMaterialName());
                        }
                        double materialCost = matLine.getMaterialCostTotal();
                        InvoiceLineItem materialLine = new InvoiceLineItem();
                        materialLine.setProductId(orderItem.getProductId());
                        materialLine.setProductName(matLine.getMaterialName() + " (" + orderItem.getProductName() + ")");
                        materialLine.setItemType("MATERIAL");
                        materialLine.setQuantity((double) orderItem.getQuantity());
                        materialLine.setUnitPrice(matLine.getMaterialCostPerUnit());
                        materialLine.setTotalPrice(materialCost);
                        materialLine.setMaterialCost(materialCost);
                        materialLine.setProductionCost(0.0);
                        items.add(materialLine);
                        totalMaterialCost += materialCost;
                    }
                }

                if (itemBreakdown.hasOperationSheet()) {
                    for (com.dppsmart.dppsmart.Orders.Entities.OperationCostLineSnapshot opLine : itemBreakdown.operationLines()) {
                        double costPerMinute = opLine.getCostPerMinute() != null ? opLine.getCostPerMinute() : 0.0;
                        if (costPerMinute <= 0) {
                            missingOperations.add(opLine.getOperationName());
                        }
                        double operationCost = opLine.getOperationCostTotal();
                        InvoiceLineItem prodLine = new InvoiceLineItem();
                        prodLine.setProductId(orderItem.getProductId());
                        prodLine.setProductName(opLine.getOperationName() + " (" + orderItem.getProductName() + ")");
                        prodLine.setItemType("PRODUCTION");
                        prodLine.setQuantity((double) orderItem.getQuantity());
                        
                        double durationPerUnit = opLine.getDurationPerUnit() != null ? opLine.getDurationPerUnit() : 0.0;
                        
                        prodLine.setDurationPerUnit(durationPerUnit > 0 ? durationPerUnit : null);
                        prodLine.setCostPerMinute(costPerMinute > 0 ? costPerMinute : null);
                        prodLine.setUnitPrice(opLine.getCostPerUnit());
                        prodLine.setTotalPrice(operationCost);
                        prodLine.setProductionCost(operationCost);
                        prodLine.setMaterialCost(0.0);
                        items.add(prodLine);
                        totalProductionCost += operationCost;
                    }
                }
            }
            
            if (!missingMaterials.isEmpty() || !missingOperations.isEmpty()) {
                StringBuilder error = new StringBuilder("MISSING_PRICING|");
                if (!missingMaterials.isEmpty()) {
                    error.append("MAT:").append(String.join(",", missingMaterials)).append("|");
                }
                if (!missingOperations.isEmpty()) {
                    error.append("OP:").append(String.join(",", missingOperations)).append("|");
                }
                throw new BadRequestException(error.toString());
            }
        }

        double subtotal = isClientSupplied ? totalProductionCost : totalProductionCost + totalMaterialCost;
        return new CostBreakdown(items, isClientSupplied ? 0.0 : totalMaterialCost, totalProductionCost, subtotal);
    }

    private boolean isInProduction(Orders order) {
        return order.getStatus() == ClientOrderStatus.IN_PRODUCTION
            || order.getStatus() == ClientOrderStatus.PRODUCTION_COMPLETED
            || order.getStatus() == ClientOrderStatus.READY_FOR_DELIVERY
            || order.getStatus() == ClientOrderStatus.FINAL_PAYMENT_PENDING
            || order.getStatus() == ClientOrderStatus.DELIVERED
            || order.getStatus() == ClientOrderStatus.CLOSED;
    }

    private boolean enrichInvoiceCostsFromOrder(Invoice invoice) {
        if (invoice.getOrderId() == null) return false;
        if (!needsCostEnrichment(invoice)) return false;

        Optional<Orders> orderOpt = ordersRepository.findById(invoice.getOrderId());
        if (orderOpt.isEmpty()) return false;

        Orders order = orderOpt.get();
        ManufacturingMode mode = order.getManufacturingMode() != null
                ? order.getManufacturingMode() : ManufacturingMode.FULL_MANUFACTURING;
        boolean isClientSupplied = mode == ManufacturingMode.CLIENT_SUPPLIED_MATERIALS;
        CostBreakdown breakdown = buildCostLineItemsFromOrder(order, isClientSupplied, true);
        if (breakdown.items().isEmpty()) return false;

        invoice.setItems(breakdown.items());
        invoice.setTotalMaterialCost(breakdown.totalMaterialCost());
        invoice.setTotalProductionCost(breakdown.totalProductionCost());
        invoice.setManufacturingMode(mode.name());
        if (invoice.getCurrency() == null && order.getCurrency() != null) {
            invoice.setCurrency(order.getCurrency());
        }
        return true;
    }

    private boolean needsCostEnrichment(Invoice invoice) {
        if (invoice.getStatus() != InvoiceStatus.DRAFT) return false;

        if (invoice.getItems() == null || invoice.getItems().isEmpty()) return true;

        boolean hasProductionLines = invoice.getItems().stream()
                .anyMatch(i -> "PRODUCTION".equals(i.getItemType()));
        if (!hasProductionLines) return true;

        double productionTotal = invoice.getItems().stream()
                .filter(i -> "PRODUCTION".equals(i.getItemType()))
                .mapToDouble(i -> i.getTotalPrice() != null ? i.getTotalPrice() : 0)
                .sum();
        return productionTotal <= 0;
    }

    public void recalculateDraftInvoicesForOrder(String orderId) {
        List<Invoice> drafts = invoiceRepository.findByOrderId(orderId).stream()
                .filter(i -> i.getStatus() == InvoiceStatus.DRAFT)
                .toList();
        if (drafts.isEmpty()) return;

        Optional<Orders> orderOpt = ordersRepository.findById(orderId);
        if (orderOpt.isEmpty()) return;
        Orders order = orderOpt.get();
        if (isInProduction(order)) return;

        ManufacturingMode mode = order.getManufacturingMode() != null
                ? order.getManufacturingMode() : ManufacturingMode.FULL_MANUFACTURING;
        boolean isClientSupplied = mode == ManufacturingMode.CLIENT_SUPPLIED_MATERIALS;
        CostBreakdown breakdown = buildCostLineItemsFromOrder(order, isClientSupplied, true);
        if (breakdown.items().isEmpty()) return;

        for (Invoice invoice : drafts) {
            invoice.setItems(breakdown.items());
            invoice.setTotalMaterialCost(breakdown.totalMaterialCost());
            invoice.setTotalProductionCost(breakdown.totalProductionCost());
            invoice.setManufacturingMode(mode.name());
            if (order.getCurrency() != null) {
                invoice.setCurrency(order.getCurrency());
            }
            recalculateInvoiceTotals(invoice);
            invoice.setUpdatedAt(LocalDateTime.now());
            Invoice saved = invoiceRepository.save(invoice);
            generateAndStorePdf(saved);
        }
    }

    private static void populateProductionLineFields(InvoiceLineItem line,
            com.dppsmart.dppsmart.Orders.Entities.OperationCostLineSnapshot opLine,
            int qty, double costPerMinute, double costPerUnit, double lineTotal) {
        double durationPerUnit = opLine.getDurationPerUnit() != null ? opLine.getDurationPerUnit() : 0;
        if (durationPerUnit <= 0 && costPerUnit > 0 && costPerMinute > 0) {
            durationPerUnit = costPerUnit / costPerMinute;
        }
        line.setQuantity((double) qty);
        line.setDurationPerUnit(durationPerUnit > 0 ? round2(durationPerUnit) : null);
        line.setCostPerMinute(costPerMinute > 0 ? costPerMinute : null);
        line.setUnitPrice(costPerUnit > 0 ? costPerUnit : (qty > 0 ? round2(lineTotal / qty) : null));
        line.setTotalPrice(lineTotal);
        line.setProductionCost(lineTotal);
        line.setMaterialCost(0.0);
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private void recalculateInvoiceTotals(Invoice invoice) {
        double materialTotal = invoice.getItems() != null
                ? invoice.getItems().stream()
                .filter(i -> "MATERIAL".equals(i.getItemType()))
                .mapToDouble(i -> i.getTotalPrice() != null ? i.getTotalPrice() : 0)
                .sum()
                : 0;
        double productionTotal = invoice.getItems() != null
                ? invoice.getItems().stream()
                .filter(i -> "PRODUCTION".equals(i.getItemType()) || "PRODUCT".equals(i.getItemType()))
                .mapToDouble(i -> i.getTotalPrice() != null ? i.getTotalPrice() : 0)
                .sum()
                : 0;

        if (materialTotal > 0 || productionTotal > 0) {
            invoice.setTotalMaterialCost(materialTotal);
            invoice.setTotalProductionCost(productionTotal);
            boolean clientSupplied = "CLIENT_SUPPLIED_MATERIALS".equals(invoice.getManufacturingMode());
            double subtotal = clientSupplied ? productionTotal : materialTotal + productionTotal;
            invoice.setSubtotal(subtotal);
        }

        double subtotal = invoice.getSubtotal() != null ? invoice.getSubtotal() : 0;
        double taxRate = invoice.getTaxRate() != null ? invoice.getTaxRate() : 0;
        double discountPct = invoice.getDiscountPercent() != null ? invoice.getDiscountPercent() : 0;
        double discountAmount = subtotal * (discountPct / 100);
        double taxAmount = (subtotal - discountAmount) * (taxRate / 100);
        invoice.setDiscountAmount(discountAmount);
        invoice.setTaxAmount(taxAmount);
        invoice.setTotal(subtotal - discountAmount + taxAmount);
    }

    private void generateAndStorePdf(Invoice invoice) {
        try {
            Orders order = invoice.getOrderId() != null
                    ? ordersRepository.findById(invoice.getOrderId()).orElse(null) : null;

            InvoiceDto dto = toDto(invoice);
            byte[] pdf = pdfGenerator.generatePdf(dto, "SmartTex", "",
                    order != null ? order.getClientId() : "", "");
            invoice.setPdfData(pdf);
            invoiceRepository.save(invoice);
        } catch (Exception e) {
        }
    }

    private InvoiceDto toDto(Invoice invoice) {
        if (invoice == null) return null;
        InvoiceDto dto = new InvoiceDto();
        dto.setId(invoice.getId());
        dto.setInvoiceNumber(invoice.getInvoiceNumber());
        dto.setOrderId(invoice.getOrderId());
        dto.setQuoteId(invoice.getQuoteId());
        dto.setClientId(invoice.getClientId());
        dto.setOrganizationId(invoice.getOrganizationId());
        dto.setItems(invoice.getItems() != null ? invoice.getItems().stream().map(this::toLineItemDto).collect(Collectors.toList()) : null);
        dto.setSubtotal(invoice.getSubtotal());
        dto.setTotalProductionCost(invoice.getTotalProductionCost());
        dto.setTotalMaterialCost(invoice.getTotalMaterialCost());
        dto.setTaxRate(invoice.getTaxRate());
        dto.setTaxAmount(invoice.getTaxAmount());
        dto.setDiscountPercent(invoice.getDiscountPercent());
        dto.setDiscountAmount(invoice.getDiscountAmount());
        dto.setTotal(invoice.getTotal());
        dto.setAmountPaid(invoice.getAmountPaid());
        dto.setCurrency(invoice.getCurrency());
        dto.setStatus(invoice.getStatus());
        dto.setManufacturingMode(invoice.getManufacturingMode());
        dto.setIssueDate(invoice.getIssueDate());
        dto.setDueDate(invoice.getDueDate());
        dto.setPaidDate(invoice.getPaidDate());
        dto.setNotes(invoice.getNotes());
        
        if (invoice.getTotal() != null && invoice.getCurrency() != null) {
            dto.setAmountInWords(NumberToWordsConverter.convertToWords(invoice.getTotal(), invoice.getCurrency()));
        }
        
        dto.setHasPdf(invoice.getPdfData() != null && invoice.getPdfData().length > 0);
        dto.setCreatedAt(invoice.getCreatedAt());
        dto.setSentAt(invoice.getSentAt());
        dto.setCreatedBy(invoice.getCreatedBy());

        populateShippingInformation(invoice, dto);

        return dto;
    }

    private void populateShippingInformation(Invoice invoice, InvoiceDto dto) {
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            dto.setTotalBoxes(invoice.getTotalBoxes());
            dto.setShippedQuantity(invoice.getShippedQuantity());
            dto.setBoxSummaries(invoice.getBoxSummaries());
            dto.setExpeditionStatus(invoice.getExpeditionStatus());
            dto.setShipmentDate(invoice.getShipmentDate());
            return;
        }

        if (invoice.getOrderId() == null) return;
        
        Optional<com.dppsmart.dppsmart.Expedition.Entities.Expedition> expOpt = expeditionRepository.findByOrderId(invoice.getOrderId());
        if (expOpt.isEmpty()) return;
        com.dppsmart.dppsmart.Expedition.Entities.Expedition exp = expOpt.get();

        dto.setExpeditionStatus(exp.getStatus() != null ? exp.getStatus().name() : null);
        if (exp.getStatus() == com.dppsmart.dppsmart.Expedition.Entities.ExpeditionStatus.SHIPPED || 
            exp.getStatus() == com.dppsmart.dppsmart.Expedition.Entities.ExpeditionStatus.DELIVERED) {
            dto.setShipmentDate(exp.getCompletedAt() != null ? exp.getCompletedAt().toLocalDate() : null);
        }

        List<com.dppsmart.dppsmart.Expedition.Entities.PackageBox> boxes = packageBoxRepository.findByExpeditionIdOrderByBoxNumberAsc(exp.getId());
        
        int totalBoxes = boxes.size();
        int shippedQty = exp.getPackedQuantity() != null ? exp.getPackedQuantity() : 0;
        
        java.util.Map<Integer, Integer> capacityCounts = new java.util.HashMap<>();
        for (com.dppsmart.dppsmart.Expedition.Entities.PackageBox box : boxes) {
            int capacity = box.getCapacity() != null ? box.getCapacity() : 0;
            capacityCounts.put(capacity, capacityCounts.getOrDefault(capacity, 0) + 1);
        }
        
        List<com.dppsmart.dppsmart.Billing.DTO.BoxTypeSummary> summaries = new ArrayList<>();
        for (java.util.Map.Entry<Integer, Integer> entry : capacityCounts.entrySet()) {
            com.dppsmart.dppsmart.Billing.DTO.BoxTypeSummary summary = new com.dppsmart.dppsmart.Billing.DTO.BoxTypeSummary();
            summary.setCapacity(entry.getKey());
            summary.setQuantity(entry.getValue());
            if (entry.getKey() <= 50) {
                summary.setBoxType("Small Box (" + entry.getKey() + " pcs)");
            } else if (entry.getKey() <= 100) {
                summary.setBoxType("Medium Box (" + entry.getKey() + " pcs)");
            } else {
                summary.setBoxType("Large Box (" + entry.getKey() + " pcs)");
            }
            summaries.add(summary);
        }
        
        if (invoice.getManualTotalBoxes() != null) {
            dto.setTotalBoxes(invoice.getManualTotalBoxes());
            dto.setBoxSummaries(null);
        } else {
            dto.setTotalBoxes(totalBoxes);
            dto.setBoxSummaries(summaries);
        }
        dto.setShippedQuantity(shippedQty);
    }

    private void snapshotShippingInformation(Invoice invoice) {
        if (invoice.getOrderId() == null) return;
        
        Optional<com.dppsmart.dppsmart.Expedition.Entities.Expedition> expOpt = expeditionRepository.findByOrderId(invoice.getOrderId());
        if (expOpt.isEmpty()) return;
        com.dppsmart.dppsmart.Expedition.Entities.Expedition exp = expOpt.get();

        invoice.setExpeditionStatus(exp.getStatus() != null ? exp.getStatus().name() : null);
        if (exp.getStatus() == com.dppsmart.dppsmart.Expedition.Entities.ExpeditionStatus.SHIPPED || 
            exp.getStatus() == com.dppsmart.dppsmart.Expedition.Entities.ExpeditionStatus.DELIVERED) {
            invoice.setShipmentDate(exp.getCompletedAt() != null ? exp.getCompletedAt().toLocalDate() : null);
        }

        List<com.dppsmart.dppsmart.Expedition.Entities.PackageBox> boxes = packageBoxRepository.findByExpeditionIdOrderByBoxNumberAsc(exp.getId());
        
        int totalBoxes = boxes.size();
        int shippedQty = exp.getPackedQuantity() != null ? exp.getPackedQuantity() : 0;
        
        java.util.Map<Integer, Integer> capacityCounts = new java.util.HashMap<>();
        for (com.dppsmart.dppsmart.Expedition.Entities.PackageBox box : boxes) {
            int capacity = box.getCapacity() != null ? box.getCapacity() : 0;
            capacityCounts.put(capacity, capacityCounts.getOrDefault(capacity, 0) + 1);
        }
        
        List<com.dppsmart.dppsmart.Billing.DTO.BoxTypeSummary> summaries = new ArrayList<>();
        for (java.util.Map.Entry<Integer, Integer> entry : capacityCounts.entrySet()) {
            com.dppsmart.dppsmart.Billing.DTO.BoxTypeSummary summary = new com.dppsmart.dppsmart.Billing.DTO.BoxTypeSummary();
            summary.setCapacity(entry.getKey());
            summary.setQuantity(entry.getValue());
            if (entry.getKey() <= 50) {
                summary.setBoxType("Small Box (" + entry.getKey() + " pcs)");
            } else if (entry.getKey() <= 100) {
                summary.setBoxType("Medium Box (" + entry.getKey() + " pcs)");
            } else {
                summary.setBoxType("Large Box (" + entry.getKey() + " pcs)");
            }
            summaries.add(summary);
        }
        
        if (invoice.getManualTotalBoxes() != null) {
            invoice.setTotalBoxes(invoice.getManualTotalBoxes());
            invoice.setBoxSummaries(null);
        } else {
            invoice.setTotalBoxes(totalBoxes);
            invoice.setBoxSummaries(summaries);
        }
        invoice.setShippedQuantity(shippedQty);
    }

    private InvoiceLineItemDto toLineItemDto(InvoiceLineItem item) {
        InvoiceLineItemDto dto = new InvoiceLineItemDto();
        dto.setProductId(item.getProductId());
        dto.setProductName(item.getProductName());
        dto.setItemType(item.getItemType());
        dto.setQuantity(item.getQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setTotalPrice(item.getTotalPrice());
        dto.setProductionStepId(item.getProductionStepId());
        dto.setCompletedQuantity(item.getCompletedQuantity());
        dto.setProductionCost(item.getProductionCost());
        dto.setMaterialCost(item.getMaterialCost());
        dto.setDurationPerUnit(item.getDurationPerUnit());
        dto.setCostPerMinute(item.getCostPerMinute());
        return dto;
    }

    private PaymentDto toPaymentDto(Payment payment) {
        PaymentDto dto = new PaymentDto();
        dto.setId(payment.getId());
        dto.setInvoiceId(payment.getInvoiceId());
        dto.setAmount(payment.getAmount());
        dto.setPaymentMethod(payment.getPaymentMethod());
        dto.setReference(payment.getReferenceNumber());
        dto.setNotes(payment.getNotes());
        dto.setCreatedAt(payment.getCreatedAt());
        return dto;
    }
}
