package com.dppsmart.dppsmart.Billing.Controllers;

import com.dppsmart.dppsmart.Billing.DTO.CreateProductPriceDto;
import com.dppsmart.dppsmart.Billing.DTO.ProductPriceDto;
import com.dppsmart.dppsmart.Billing.Services.AiPricingService;
import com.dppsmart.dppsmart.Billing.Services.PricingService;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/billing/prices")
public class PricingController {

    @Autowired private PricingService pricingService;
    @Autowired private UserRepository userRepository;
    @Autowired private AiPricingService aiPricingService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<ProductPriceDto> getPrices(
            @RequestParam(required = false) String productId,
            @RequestParam(required = false) String clientId) {
        User user = getCurrentUser();
        return pricingService.getPrices(user.getOrganizationId(), productId, clientId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductPriceDto getPrice(@PathVariable String id) {
        return pricingService.getPrice(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductPriceDto createPrice(@RequestBody @Valid CreateProductPriceDto dto) {
        return pricingService.createPrice(dto, getCurrentUser());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductPriceDto updatePrice(@PathVariable String id, @RequestBody @Valid CreateProductPriceDto dto) {
        return pricingService.updatePrice(id, dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public void deletePrice(@PathVariable String id) {
        pricingService.deletePrice(id);
    }

    @PostMapping("/suggest/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<AiPricingService.AiPriceSuggestion> suggestAiPrice(@PathVariable String productId) {
        return ResponseEntity.ok(aiPricingService.suggestPrice(productId));
    }

    @PostMapping("/approve-suggestion")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductPriceDto approveSuggestion(@RequestBody Map<String, Object> body) {
        String productId = (String) body.get("productId");
        double unitPrice = Double.parseDouble(body.get("unitPrice").toString());
        String currency = (String) body.getOrDefault("currency", "MAD");

        CreateProductPriceDto dto = new CreateProductPriceDto();
        dto.setProductId(productId);
        dto.setUnitPrice(unitPrice);
        dto.setCurrency(currency);
        return pricingService.createPrice(dto, getCurrentUser());
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
