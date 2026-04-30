package com.dppsmart.dppsmart.Ai.Controllers;

import com.dppsmart.dppsmart.Ai.DTO.AiChatRequestDto;
import com.dppsmart.dppsmart.Ai.DTO.AiChatResponseDto;
import com.dppsmart.dppsmart.Ai.DTO.ProductAiScoreDto;
import com.dppsmart.dppsmart.Ai.Services.GroqService;
import com.dppsmart.dppsmart.Ai.Services.ProductAiScoringService;
import com.dppsmart.dppsmart.Common.ApiResponse;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final GroqService groqService;
    private final ProductAiScoringService productAiScoringService;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    @PostMapping("/chat")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE','CLIENT')")
    public ResponseEntity<ApiResponse<AiChatResponseDto>> chat(@RequestBody @Valid AiChatRequestDto dto) {
        String reply = groqService.chat(dto);
        return ResponseEntity.ok(ApiResponse.ok("ok", new AiChatResponseDto(reply)));
    }

    @PostMapping("/public/chat")
    public ResponseEntity<ApiResponse<AiChatResponseDto>> publicChat(@RequestBody @Valid AiChatRequestDto dto) {
        String reply = groqService.publicChat(dto.getMessage());
        return ResponseEntity.ok(ApiResponse.ok("ok", new AiChatResponseDto(reply)));
    }

    @GetMapping("/products/{productId}/score")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE','CLIENT')")
    public ResponseEntity<ApiResponse<ProductAiScoreDto>> productScore(@PathVariable String productId) {
        User user = getCurrentUser();
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found"));
        if (!permissionService.canAccessOrganization(user, p.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to access this product");
        }
        ProductAiScoreDto score = productAiScoringService.scoreProduct(p);
        return ResponseEntity.ok(ApiResponse.ok("ok", score));
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}

