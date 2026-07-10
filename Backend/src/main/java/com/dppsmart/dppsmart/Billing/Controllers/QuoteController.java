package com.dppsmart.dppsmart.Billing.Controllers;

import com.dppsmart.dppsmart.Billing.DTO.CreateQuoteDto;
import com.dppsmart.dppsmart.Billing.DTO.QuoteDto;
import com.dppsmart.dppsmart.Billing.Services.QuoteService;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing/quotes")
public class QuoteController {

    @Autowired private QuoteService quoteService;
    @Autowired private UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public List<QuoteDto> getQuotes(
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String status) {
        User user = getCurrentUser();
        return quoteService.getQuotes(user.getOrganizationId(), clientId, status);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public QuoteDto getQuote(@PathVariable String id) {
        return quoteService.getQuote(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public QuoteDto createQuote(@RequestBody @Valid CreateQuoteDto dto) {
        return quoteService.createQuote(dto, getCurrentUser());
    }

    @PostMapping("/from-order/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public QuoteDto createQuoteFromOrder(@PathVariable String orderId) {
        return quoteService.createQuoteFromOrder(orderId, getCurrentUser());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public QuoteDto updateQuote(@PathVariable String id, @RequestBody @Valid CreateQuoteDto dto) {
        return quoteService.updateQuote(id, dto);
    }

    @PostMapping("/{id}/send")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public QuoteDto sendQuote(@PathVariable String id) {
        return quoteService.sendQuote(id);
    }

    @PostMapping("/{id}/accept")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public QuoteDto acceptQuote(@PathVariable String id) {
        return quoteService.acceptQuote(id);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public QuoteDto rejectQuote(@PathVariable String id) {
        return quoteService.rejectQuote(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public void deleteQuote(@PathVariable String id) {
        quoteService.deleteQuote(id);
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
