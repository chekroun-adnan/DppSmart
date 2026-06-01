package com.dppsmart.dppsmart.Scan.Services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;

@Service
public class QRCodeSigningService {

    private static final String HMAC_ALGO = "HmacSHA256";

    private final String signingSecret;

    public QRCodeSigningService(@Value("${app.qr.signing-secret}") String signingSecret) {
        this.signingSecret = signingSecret;
    }

    public String sign(String productId, int version) {
        long expiry = Instant.now().getEpochSecond() + 365 * 86400L;
        String payload = productId + ":" + version + ":" + expiry;
        String sig = hmac(payload);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(sig.getBytes())
                + "." + expiry;
    }

    public SignatureVerifyResult verify(String productId, int currentVersion, String encodedSig) {
        if (encodedSig == null || encodedSig.isBlank()) {
            return SignatureVerifyResult.invalidSig("missing signature");
        }

        String[] parts = encodedSig.split("\\.");
        if (parts.length != 2) {
            return SignatureVerifyResult.invalidSig("malformed signature");
        }

        long expiry;
        try {
            expiry = Long.parseLong(parts[1]);
        } catch (NumberFormatException e) {
            return SignatureVerifyResult.invalidSig("invalid expiry");
        }

        long now = Instant.now().getEpochSecond();
        if (now > expiry) {
            return SignatureVerifyResult.tokenExpired();
        }

        String expectedPayload = productId + ":" + currentVersion + ":" + expiry;
        String expectedSig = hmac(expectedPayload);
        String providedSig;
        try {
            providedSig = new String(Base64.getUrlDecoder().decode(parts[0]));
        } catch (IllegalArgumentException e) {
            return SignatureVerifyResult.invalidSig("base64 decode failed");
        }

        if (!expectedSig.equals(providedSig)) {
            return SignatureVerifyResult.invalidSig("signature mismatch");
        }

        return SignatureVerifyResult.ok();
    }

    public String buildSignedUrl(String baseUrl, String productId, int version) {
        String token = sign(productId, version);
        return baseUrl + "?sig=" + token;
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(signingSecret.getBytes(), HMAC_ALGO));
            byte[] bytes = mac.doFinal(data.getBytes());
            return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("HMAC failure", e);
        }
    }

    public record SignatureVerifyResult(boolean valid, boolean expired, String reason) {
        public static SignatureVerifyResult ok() {
            return new SignatureVerifyResult(true, false, null);
        }
        public static SignatureVerifyResult tokenExpired() {
            return new SignatureVerifyResult(false, true, "QR code has expired");
        }
        public static SignatureVerifyResult invalidSig(String reason) {
            return new SignatureVerifyResult(false, false, reason);
        }
    }
}
