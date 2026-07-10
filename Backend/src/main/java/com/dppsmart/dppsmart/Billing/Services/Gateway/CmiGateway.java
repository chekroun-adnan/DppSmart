package com.dppsmart.dppsmart.Billing.Services.Gateway;

import com.dppsmart.dppsmart.Billing.Entities.Invoice;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

@Component
@Slf4j
public class CmiGateway implements PaymentGateway {

    @Value("${payment.cmi.merchant-id:MERCHANT_TEST}")
    private String merchantId;

    @Value("${payment.cmi.store-key:TEST_STORE_KEY}")
    private String storeKey;

    @Value("${payment.cmi.api-url:https://testpayment.cmi.co.ma/fim/est3dgate}")
    private String apiUrl;

    @Override
    public String getProviderName() {
        return "CMI";
    }

    @Override
    public boolean supportsMethod(String method) {
        return "CMI".equalsIgnoreCase(method) || "M2T".equalsIgnoreCase(method);
    }

    @Override
    public PaymentSession createPaymentSession(Invoice invoice, String successUrl, String cancelUrl) {
        String oid = "INV-" + invoice.getId().substring(0, Math.min(16, invoice.getId().length()));
        String amount = String.format("%.2f", invoice.getTotal() != null ? invoice.getTotal() : 0);
        String currency = "504"; // 504 = MAD ISO numeric

        String hash = generateHash(merchantId, oid, amount, currency, successUrl);

        String formHtml = String.format("""
            <form id="cmi-form" method="post" action="%s">
              <input type="hidden" name="action" value="sale" />
              <input type="hidden" name="amount" value="%s" />
              <input type="hidden" name="currency" value="%s" />
              <input type="hidden" name="oid" value="%s" />
              <input type="hidden" name="merchantid" value="%s" />
              <input type="hidden" name="okurl" value="%s" />
              <input type="hidden" name="failurl" value="%s" />
              <input type="hidden" name="lang" value="fr" />
              <input type="hidden" name="hash" value="%s" />
              <input type="hidden" name="rnd" value="%s" />
              <input type="hidden" name="storetype" value="3d_pay" />
              <input type="hidden" name="BillToCompany" value="DppSmarts" />
              <input type="hidden" name="email" value="client@example.com" />
            </form>
            <script>document.getElementById('cmi-form').submit();</script>
            """,
            apiUrl, amount, currency, oid, merchantId, successUrl, cancelUrl, hash,
            UUID.randomUUID().toString().replace("-", "").substring(0, 20)
        );

        return new PaymentSession(oid, null, formHtml, oid);
    }

    @Override
    public PaymentResult handleReturn(String sessionId, String gatewayResponse) {
        log.info("CMI return for session {}: {}", sessionId, gatewayResponse);
        return new PaymentResult(true, sessionId, null, "CMI payment completed");
    }

    private String generateHash(String merchantId, String oid, String amount, String currency, String okUrl) {
        try {
            String data = merchantId + oid + amount + currency + okUrl + storeKey;
            MessageDigest md = MessageDigest.getInstance("SHA-512");
            byte[] hash = md.digest(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).toUpperCase();
        } catch (Exception e) {
            log.warn("Failed to generate CMI hash: {}", e.getMessage());
            return "HASH_ERROR";
        }
    }
}
