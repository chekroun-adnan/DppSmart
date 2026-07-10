package com.dppsmart.dppsmart.Billing.Controllers;

import com.dppsmart.dppsmart.Billing.DTO.InvoiceDto;
import com.dppsmart.dppsmart.Billing.DTO.PaymentDto;
import com.dppsmart.dppsmart.Billing.DTO.RecordPaymentDto;
import com.dppsmart.dppsmart.Billing.Services.InvoiceService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import com.dppsmart.dppsmart.Orders.Entities.ManufacturingMode;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing/invoices")
public class InvoiceController {

    @Autowired private InvoiceService invoiceService;
    @Autowired private UserRepository userRepository;
    @Autowired private com.dppsmart.dppsmart.TechnicalSheet.Services.TechnicalSheetModuleService technicalSheetModuleService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<InvoiceDto> getInvoices(
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String status) {
        User user = getCurrentUser();
        String orgId = user.getRole() == Roles.ADMIN ? null : user.getOrganizationId();
        return invoiceService.getInvoices(orgId, clientId, status);
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('CLIENT')")
    public List<InvoiceDto> getMyInvoices() {
        User user = getCurrentUser();
        return invoiceService.getClientInvoices(user.getOrganizationId());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','CLIENT')")
    public InvoiceDto getInvoice(@PathVariable String id) {
        return invoiceService.getInvoice(id);
    }

    @PostMapping("/from-quote/{quoteId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public InvoiceDto createInvoiceFromQuote(@PathVariable String quoteId) {
        return invoiceService.createInvoiceFromQuote(quoteId, getCurrentUser());
    }

    @PostMapping("/from-order/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public InvoiceDto createInvoiceFromOrder(
            @PathVariable String orderId,
            @RequestParam(required = false) String manufacturingMode) {
        ManufacturingMode mode = null;
        if (manufacturingMode != null && !manufacturingMode.isBlank()) {
            try {
                mode = ManufacturingMode.valueOf(manufacturingMode.toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }
        return invoiceService.createInvoiceFromOrder(orderId, mode, getCurrentUser());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public InvoiceDto updateInvoice(@PathVariable String id, @RequestBody InvoiceDto dto) {
        return invoiceService.updateInvoice(id, dto, getCurrentUser());
    }

    @PutMapping("/{id}/manual-boxes")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public InvoiceDto setManualBoxes(@PathVariable String id, @RequestBody java.util.Map<String, Integer> payload) {
        return invoiceService.setManualBoxes(id, payload.get("manualTotalBoxes"));
    }

    @PostMapping("/{id}/send")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public InvoiceDto sendInvoice(@PathVariable String id) {
        return invoiceService.sendInvoice(id);
    }

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public InvoiceDto recordPayment(@PathVariable String id, @RequestBody @Valid RecordPaymentDto dto) {
        return invoiceService.recordPayment(id, dto, getCurrentUser());
    }

    @GetMapping("/{id}/payments")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<PaymentDto> getPayments(@PathVariable String id) {
        return invoiceService.getPayments(id);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public InvoiceDto cancelInvoice(@PathVariable String id) {
        return invoiceService.cancelInvoice(id);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable String id) {
        return invoiceService.downloadPdf(id);
    }
    
    @GetMapping("/recalculate-all")
    public ResponseEntity<String> recalculateAll() {
        technicalSheetModuleService.migrateOldTechnicalSheets();
        invoiceService.recalculateAllInvoices();
        return ResponseEntity.ok("All invoices recalculated");
    }

    private User getCurrentUser() {
        Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
