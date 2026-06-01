package com.dppsmart.dppsmart.Product.Services;

import com.dppsmart.dppsmart.Scan.Services.QRCodeSigningService;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class QRCodeService {

    private final QRCodeSigningService signingService;

    public String generateQRCode(String text) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(text, BarcodeFormat.QR_CODE, 250, 250);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);

            return "data:image/png;base64," +
                    Base64.getEncoder().encodeToString(out.toByteArray());

        } catch (Exception e) {
            throw new RuntimeException("QR generation failed", e);
        }
    }

    public String generateSignedQRCode(String passportUrl, String productId, int version) {
        String signedUrl = signingService.buildSignedUrl(passportUrl, productId, version);
        return generateQRCode(signedUrl);
    }
}
