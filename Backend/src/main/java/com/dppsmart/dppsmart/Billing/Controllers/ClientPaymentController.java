package com.dppsmart.dppsmart.Billing.Controllers;

import com.dppsmart.dppsmart.Billing.DTO.CreatePaymentSessionDto;
import com.dppsmart.dppsmart.Billing.DTO.InvoiceDto;
import com.dppsmart.dppsmart.Billing.DTO.PaymentSessionResponseDto;
import com.dppsmart.dppsmart.Billing.Services.Gateway.PaymentGatewayService;
import com.dppsmart.dppsmart.Billing.Services.Gateway.PaymentResult;
import com.dppsmart.dppsmart.Billing.Services.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/billing/client/payments")
public class ClientPaymentController {

    @Autowired private PaymentGatewayService paymentGatewayService;
    @Autowired private InvoiceService invoiceService;

    @GetMapping("/methods")
    @PreAuthorize("hasAnyRole('CLIENT','ADMIN','SUBADMIN')")
    public ResponseEntity<?> getMethods() {
        return ResponseEntity.ok(Map.of("methods", paymentGatewayService.getAvailableProviders()));
    }

    @PostMapping("/create-session")
    @PreAuthorize("hasAnyRole('CLIENT','ADMIN','SUBADMIN')")
    public ResponseEntity<PaymentSessionResponseDto> createSession(@RequestBody @Valid CreatePaymentSessionDto dto) {
        var session = paymentGatewayService.createSession(
                dto.getInvoiceId(),
                dto.getPaymentMethod(),
                dto.getSuccessUrl() != null ? dto.getSuccessUrl() : "/payments/success",
                dto.getCancelUrl() != null ? dto.getCancelUrl() : "/payments/cancel"
        );
        return ResponseEntity.ok(new PaymentSessionResponseDto(
                session.sessionId(),
                session.redirectUrl(),
                session.formHtml(),
                session.gatewayReference(),
                dto.getPaymentMethod()
        ));
    }

    @GetMapping("/return")
    public ResponseEntity<?> handleReturn(
            @RequestParam String method,
            @RequestParam("session_id") String sessionId,
            @RequestParam(required = false) String status) {
        PaymentResult result = paymentGatewayService.handleReturn(method, sessionId, status);
        if (result.success()) {
            return ResponseEntity.ok(Map.of("success", true, "message", result.message()));
        }
        return ResponseEntity.badRequest().body(Map.of("success", false, "message", result.message()));
    }

    @GetMapping("/invoices/{id}")
    @PreAuthorize("hasAnyRole('CLIENT','ADMIN','SUBADMIN')")
    public ResponseEntity<InvoiceDto> getClientInvoice(@PathVariable String id) {
        return ResponseEntity.ok(invoiceService.getInvoice(id));
    }
}
