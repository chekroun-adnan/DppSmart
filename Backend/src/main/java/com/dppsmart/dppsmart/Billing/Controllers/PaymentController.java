package com.dppsmart.dppsmart.Billing.Controllers;

import com.dppsmart.dppsmart.Billing.Entities.Payment;
import com.dppsmart.dppsmart.Billing.Enums.PaymentMethod;
import com.dppsmart.dppsmart.Billing.Enums.PaymentRecordStatus;
import com.dppsmart.dppsmart.Billing.Enums.PaymentType;
import com.dppsmart.dppsmart.Billing.Services.PaymentService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Orders.Entities.OrderPaymentStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final OrdersRepository ordersRepository;
    private final UserRepository userRepository;

    @Value("${app.upload.dir:uploads/payments}")
    private String uploadDir;


    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('CLIENT','ADMIN','SUBADMIN')")
    public ResponseEntity<?> initiatePayment(@RequestBody Map<String, Object> body, Authentication auth) {
        User user = getUser(auth);
        String orderId = (String) body.get("orderId");
        String methodStr = (String) body.get("paymentMethod");
        String typeStr = (String) body.get("paymentType");
        Double amount = body.get("amount") != null ? ((Number) body.get("amount")).doubleValue() : null;
        String currency = (String) body.get("currency");

        PaymentMethod method;
        try {
            method = PaymentMethod.valueOf(methodStr != null ? methodStr : "BANK_TRANSFER");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid payment method: " + methodStr));
        }

        PaymentType paymentType;
        try {
            paymentType = PaymentType.valueOf(typeStr != null ? typeStr : "DEPOSIT");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid payment type: " + typeStr));
        }

        if (method != PaymentMethod.BANK_TRANSFER) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only BANK_TRANSFER is currently supported"));
        }

        try {
            Payment payment = paymentService.initiatePayment(orderId, user, method, paymentType, amount, currency);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


    @PostMapping("/{paymentId}/upload-proof")
    @PreAuthorize("hasAnyRole('CLIENT','ADMIN','SUBADMIN')")
    public ResponseEntity<?> uploadPaymentProof(
            @PathVariable String paymentId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "referenceNumber", required = false) String referenceNumber,
            Authentication auth) {
        User user = getUser(auth);

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is required"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/") && !contentType.equals("application/pdf")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only PNG, JPG, JPEG, and PDF files are allowed"));
        }

        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String filename = "payment_" + paymentId + "_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/uploads/payments/" + filename;

            Payment payment = paymentService.submitPaymentProof(paymentId, referenceNumber, fileUrl, user);
            return ResponseEntity.ok(payment);
        } catch (IOException e) {
            log.error("Failed to upload payment proof: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload file: " + e.getMessage()));
        }
    }


    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                String contentType = Files.probeContentType(filePath);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(500).build();
        }
    }


    @PostMapping("/{paymentId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> approvePayment(@PathVariable String paymentId, Authentication auth) {
        User user = getUser(auth);
        try {
            Payment payment = paymentService.approvePayment(paymentId, user);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


    @PostMapping("/{paymentId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> rejectPayment(@PathVariable String paymentId,
                                           @RequestBody(required = false) Map<String, String> body,
                                           Authentication auth) {
        User user = getUser(auth);
        String reason = body != null ? body.get("reason") : null;
        try {
            Payment payment = paymentService.rejectPayment(paymentId, user, reason);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('CLIENT','ADMIN','SUBADMIN')")
    public ResponseEntity<?> getMyPayments(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(paymentService.getClientPayments(user.getId()));
    }


    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('CLIENT','ADMIN','SUBADMIN')")
    public ResponseEntity<?> getOrderPayments(@PathVariable String orderId) {
        return ResponseEntity.ok(paymentService.getPaymentsByOrder(orderId));
    }


    @GetMapping("/{paymentId}")
    @PreAuthorize("hasAnyRole('CLIENT','ADMIN','SUBADMIN')")
    public ResponseEntity<?> getPayment(@PathVariable String paymentId) {
        return ResponseEntity.ok(paymentService.getPayment(paymentId));
    }


    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> getAdminPayments(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(paymentService.getPaymentsByOrganization(user.getOrganizationId()));
    }

    @GetMapping("/admin/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> getAdminPaymentsByStatus(@PathVariable String status, Authentication auth) {
        User user = getUser(auth);
        try {
            PaymentRecordStatus ps = PaymentRecordStatus.valueOf(status.toUpperCase());
            return ResponseEntity.ok(paymentService.getPaymentsByOrganizationAndStatus(user.getOrganizationId(), ps));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status: " + status));
        }
    }


    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> getPaymentStats(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(paymentService.getPaymentStats(user.getOrganizationId()));
    }


    private User getUser(Authentication auth) {
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("User not found"));
    }
}
