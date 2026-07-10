package com.dppsmart.dppsmart.Billing.Services;

import com.dppsmart.dppsmart.Billing.DTO.CreateQuoteDto;
import com.dppsmart.dppsmart.Billing.DTO.QuoteDto;
import com.dppsmart.dppsmart.Billing.DTO.QuoteLineItemDto;
import com.dppsmart.dppsmart.Billing.Entities.ProductPrice;
import com.dppsmart.dppsmart.Billing.Entities.Quote;
import com.dppsmart.dppsmart.Billing.Entities.QuoteLineItem;
import com.dppsmart.dppsmart.Billing.Enums.QuoteStatus;
import com.dppsmart.dppsmart.Billing.Repositories.QuoteRepository;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.OrderItem;
import com.dppsmart.dppsmart.Orders.Entities.OrderPaymentStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.Billing.Services.CostCalculationService;
import com.dppsmart.dppsmart.User.Entities.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class QuoteService {

    @Autowired private QuoteRepository quoteRepository;
    @Autowired private OrdersRepository ordersRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private PricingService pricingService;
    @Autowired private PermissionService permissionService;
    @Autowired private InvoiceNumberGenerator numberGenerator;
    @Autowired private CostCalculationService costCalculationService;

    public List<QuoteDto> getQuotes(String organizationId, String clientId, String status) {
        List<Quote> quotes;
        if (clientId != null) {
            quotes = quoteRepository.findByClientIdOrderByCreatedAtDesc(clientId);
        } else if (status != null) {
            try {
                QuoteStatus qs = QuoteStatus.valueOf(status.toUpperCase());
                quotes = quoteRepository.findByOrganizationIdAndStatusOrderByCreatedAtDesc(organizationId, qs);
            } catch (IllegalArgumentException e) {
                quotes = quoteRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId);
            }
        } else {
            quotes = quoteRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId);
        }
        return quotes.stream().map(this::toDto).collect(Collectors.toList());
    }

    public QuoteDto getQuote(String id) {
        Quote quote = quoteRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Quote not found: " + id));
        return toDto(quote);
    }

    public QuoteDto createQuote(CreateQuoteDto dto, User user) {
        Quote quote = new Quote();
        quote.setQuoteNumber(numberGenerator.generateQuoteNumber(user.getOrganizationId()));
        quote.setOrderId(dto.getOrderId());
        quote.setClientId(dto.getClientId());
        quote.setOrganizationId(user.getOrganizationId());
        quote.setStatus(QuoteStatus.DRAFT);
        quote.setCreatedBy(user.getEmail());
        quote.setCreatedAt(LocalDateTime.now());

        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            quote.setItems(dto.getItems().stream().map(this::toLineItem).collect(Collectors.toList()));
        } else if (dto.getOrderId() != null) {
            List<QuoteLineItem> items = buildItemsFromOrder(dto.getOrderId());
            quote.setItems(items);
            OrderItem firstItem = ordersRepository.findById(dto.getOrderId())
                    .map(o -> o.getItems() != null && !o.getItems().isEmpty() ? o.getItems().get(0) : null)
                    .orElse(null);
            if (quote.getClientId() == null && firstItem != null) {
                ordersRepository.findById(dto.getOrderId()).ifPresent(order ->
                        quote.setClientId(order.getClientId()));
            }
        }

        if (dto.getTaxRate() != null) quote.setTaxRate(dto.getTaxRate());
        else quote.setTaxRate(0.0);
        if (dto.getDiscountPercent() != null) quote.setDiscountPercent(dto.getDiscountPercent());
        else quote.setDiscountPercent(0.0);
        quote.setValidUntil(dto.getValidUntil() != null ? dto.getValidUntil() : LocalDate.now().plusDays(30));
        quote.setNotes(dto.getNotes());
        quote.setTermsAndConditions(dto.getTermsAndConditions());

        recalculateTotals(quote);

        quoteRepository.save(quote);
        return toDto(quote);
    }

    public QuoteDto createQuoteFromOrder(String orderId, User user) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));

        CreateQuoteDto dto = new CreateQuoteDto();
        dto.setOrderId(orderId);
        dto.setClientId(order.getClientId());
        dto.setValidUntil(LocalDate.now().plusDays(30));
        dto.setTaxRate(0.0);
        dto.setDiscountPercent(0.0);
        return createQuote(dto, user);
    }

    public QuoteDto updateQuote(String id, CreateQuoteDto dto) {
        Quote quote = quoteRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Quote not found: " + id));
        if (quote.getStatus() != QuoteStatus.DRAFT) {
            throw new BadRequestException("Only draft quotes can be edited.");
        }

        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            quote.setItems(dto.getItems().stream().map(this::toLineItem).collect(Collectors.toList()));
        }
        if (dto.getTaxRate() != null) quote.setTaxRate(dto.getTaxRate());
        if (dto.getDiscountPercent() != null) quote.setDiscountPercent(dto.getDiscountPercent());
        if (dto.getValidUntil() != null) quote.setValidUntil(dto.getValidUntil());
        if (dto.getNotes() != null) quote.setNotes(dto.getNotes());
        if (dto.getTermsAndConditions() != null) quote.setTermsAndConditions(dto.getTermsAndConditions());

        recalculateTotals(quote);
        quoteRepository.save(quote);
        return toDto(quote);
    }

    public QuoteDto sendQuote(String id) {
        Quote quote = quoteRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Quote not found: " + id));
        if (quote.getStatus() != QuoteStatus.DRAFT) {
            throw new BadRequestException("Only draft quotes can be sent.");
        }
        quote.setStatus(QuoteStatus.SENT);
        quote.setSentAt(LocalDateTime.now());
        quoteRepository.save(quote);

        updateOrderStatus(quote.getOrderId(), ClientOrderStatus.QUOTE_SENT, quote.getTotal(), quote.getCurrency());

        return toDto(quote);
    }

    public QuoteDto acceptQuote(String id) {
        Quote quote = quoteRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Quote not found: " + id));
        if (quote.getStatus() != QuoteStatus.SENT) {
            throw new BadRequestException("Only sent quotes can be accepted.");
        }
        quote.setStatus(QuoteStatus.ACCEPTED);
        quote.setAcceptedAt(LocalDateTime.now());
        quoteRepository.save(quote);

        updateOrderStatus(quote.getOrderId(), ClientOrderStatus.AWAITING_DEPOSIT, quote.getTotal(), quote.getCurrency());

        return toDto(quote);
    }

    public QuoteDto rejectQuote(String id) {
        Quote quote = quoteRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Quote not found: " + id));
        if (quote.getStatus() != QuoteStatus.SENT) {
            throw new BadRequestException("Only sent quotes can be rejected.");
        }
        quote.setStatus(QuoteStatus.REJECTED);
        quote.setRejectedAt(LocalDateTime.now());
        quoteRepository.save(quote);
        return toDto(quote);
    }

    public void deleteQuote(String id) {
        Quote quote = quoteRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Quote not found: " + id));
        if (quote.getStatus() != QuoteStatus.DRAFT) {
            throw new BadRequestException("Only draft quotes can be deleted.");
        }
        quoteRepository.deleteById(id);
    }

    private void updateOrderStatus(String orderId, ClientOrderStatus newStatus, Double total, String currency) {
        if (orderId == null) return;
        ordersRepository.findById(orderId).ifPresent(order -> {
            order.setStatus(newStatus);
            if (total != null) {
                double depositPct = order.getDepositPercent() != null ? order.getDepositPercent() : 30.0;
                double depositAmt = total * depositPct / 100;
                order.setTotalPrice(total);
                order.setAmountDue(depositAmt);
                order.setDepositAmount(depositAmt);
                order.setRemainingBalance(total - depositAmt);
                order.setCurrency(currency != null ? currency : "MAD");
                order.setAmountPaid(0.0);
                order.setPaymentStatus(OrderPaymentStatus.UNPAID);
            }
            order.setUpdatedAt(LocalDateTime.now());
            ordersRepository.save(order);
        });
    }

    private List<QuoteLineItem> buildItemsFromOrder(String orderId) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
        List<QuoteLineItem> items = new ArrayList<>();
        if (order.getItems() == null) return items;

        for (OrderItem oi : order.getItems()) {
            QuoteLineItem item = new QuoteLineItem();
            item.setProductId(oi.getProductId());
            item.setProductName(oi.getProductName());
            item.setQuantity(oi.getQuantity());
            item.setUnitPrice(resolveUnitPrice(oi.getProductId(), order.getClientId(), order.getOrganizationId()));
            item.setTotalPrice(item.getUnitPrice() * item.getQuantity());
            items.add(item);
        }
        return items;
    }

    private double resolveUnitPrice(String productId, String clientId, String organizationId) {
        Optional<ProductPrice> price = pricingService.resolvePrice(productId, clientId);
        if (price.isPresent()) return price.get().getUnitPrice();

        Optional<Product> productOpt = productRepository.findById(productId);
        if (productOpt.isPresent() && productOpt.get().getDefaultUnitPrice() != null) {
            return productOpt.get().getDefaultUnitPrice();
        }

        if (organizationId != null) {
            try {
                var cost = costCalculationService.calculateEstimatedUnitPrice(productId, organizationId);
                if (cost.estimatedUnitPrice() > 0) return cost.estimatedUnitPrice();
            } catch (Exception ignored) {}
        }

        return 0.0;
    }

    private void recalculateTotals(Quote quote) {
        double subtotal = 0;
        if (quote.getItems() != null) {
            for (QuoteLineItem item : quote.getItems()) {
                item.setTotalPrice(item.getUnitPrice() * item.getQuantity());
                subtotal += item.getTotalPrice();
            }
        }
        quote.setSubtotal(subtotal);
        double discountAmt = subtotal * (quote.getDiscountPercent() != null ? quote.getDiscountPercent() : 0) / 100;
        quote.setDiscountAmount(discountAmt);
        double afterDiscount = subtotal - discountAmt;
        double taxAmt = afterDiscount * (quote.getTaxRate() != null ? quote.getTaxRate() : 0) / 100;
        quote.setTaxAmount(taxAmt);
        quote.setTotal(afterDiscount + taxAmt);
    }

    private QuoteLineItem toLineItem(QuoteLineItemDto dto) {
        QuoteLineItem item = new QuoteLineItem();
        item.setProductId(dto.getProductId());
        item.setProductName(dto.getProductName());
        item.setQuantity(dto.getQuantity());
        item.setUnitPrice(dto.getUnitPrice());
        item.setTotalPrice(dto.getUnitPrice() * dto.getQuantity());
        return item;
    }

    private QuoteDto toDto(Quote quote) {
        if (quote == null) return null;
        QuoteDto dto = new QuoteDto();
        dto.setId(quote.getId());
        dto.setQuoteNumber(quote.getQuoteNumber());
        dto.setOrderId(quote.getOrderId());
        dto.setClientId(quote.getClientId());
        dto.setOrganizationId(quote.getOrganizationId());
        dto.setItems(quote.getItems() != null ? quote.getItems().stream().map(this::toLineItemDto).collect(Collectors.toList()) : null);
        dto.setSubtotal(quote.getSubtotal());
        dto.setTaxRate(quote.getTaxRate());
        dto.setTaxAmount(quote.getTaxAmount());
        dto.setDiscountPercent(quote.getDiscountPercent());
        dto.setDiscountAmount(quote.getDiscountAmount());
        dto.setTotal(quote.getTotal());
        dto.setCurrency(quote.getCurrency());
        dto.setStatus(quote.getStatus());
        dto.setValidUntil(quote.getValidUntil());
        dto.setNotes(quote.getNotes());
        dto.setTermsAndConditions(quote.getTermsAndConditions());
        dto.setCreatedAt(quote.getCreatedAt());
        dto.setSentAt(quote.getSentAt());
        dto.setAcceptedAt(quote.getAcceptedAt());
        dto.setCreatedBy(quote.getCreatedBy());
        return dto;
    }

    private QuoteLineItemDto toLineItemDto(QuoteLineItem item) {
        QuoteLineItemDto dto = new QuoteLineItemDto();
        dto.setProductId(item.getProductId());
        dto.setProductName(item.getProductName());
        dto.setQuantity(item.getQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setTotalPrice(item.getTotalPrice());
        return dto;
    }
}
