package com.dppsmart.dppsmart.Billing.Services.Gateway;

import com.dppsmart.dppsmart.Billing.Entities.Invoice;
import com.dppsmart.dppsmart.Billing.Enums.PaymentMethod;
import com.dppsmart.dppsmart.Billing.Repositories.InvoiceRepository;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentGatewayService {

    private final List<PaymentGateway> gateways;
    private final InvoiceRepository invoiceRepository;

    public PaymentSession createSession(String invoiceId, String method, String successUrl, String cancelUrl) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new NotFoundException("Invoice not found: " + invoiceId));

        if (invoice.getTotal() == null || invoice.getTotal() <= 0) {
            throw new BadRequestException("Invoice has no amount due");
        }

        PaymentGateway gateway = resolveGateway(method);
        return gateway.createPaymentSession(invoice, successUrl, cancelUrl);
    }

    public PaymentResult handleReturn(String method, String sessionId, String gatewayResponse) {
        PaymentGateway gateway = resolveGateway(method);
        return gateway.handleReturn(sessionId, gatewayResponse);
    }

    public PaymentGateway resolveGateway(String method) {
        return gateways.stream()
                .filter(g -> g.supportsMethod(method))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Unsupported payment method: " + method));
    }

    public List<String> getAvailableProviders() {
        return gateways.stream().map(PaymentGateway::getProviderName).toList();
    }
}
