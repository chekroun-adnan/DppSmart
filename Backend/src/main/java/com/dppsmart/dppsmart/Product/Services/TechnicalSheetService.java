package com.dppsmart.dppsmart.Product.Services;

import com.dppsmart.dppsmart.Product.DTO.TechnicalSheetDto;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Entities.RawMaterial;
import com.dppsmart.dppsmart.Product.Entities.TechnicalSheet;
import com.dppsmart.dppsmart.Production.Entities.ProductionStep;
import com.dppsmart.dppsmart.Product.Mapper.TechnicalSheetMapper;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TechnicalSheetService {

    private final ProductRepository productRepository;

    private static final Color COLOR_PRIMARY    = new Color(30, 58, 138);
    private static final Color COLOR_SECONDARY  = new Color(59, 130, 246);
    private static final Color COLOR_HEADER_BG  = new Color(239, 246, 255);
    private static final Color COLOR_ROW_ALT    = new Color(248, 250, 252);
    private static final Color COLOR_TEXT_DARK  = new Color(15, 23, 42);
    private static final Color COLOR_TEXT_MUTED = new Color(100, 116, 139);
    private static final Color COLOR_WHITE      = Color.WHITE;
    private static final Color COLOR_BORDER     = new Color(203, 213, 225);

    private static final Font FONT_TITLE   = new Font(Font.HELVETICA, 22, Font.BOLD,   COLOR_PRIMARY);
    private static final Font FONT_SUB     = new Font(Font.HELVETICA, 10, Font.NORMAL, COLOR_TEXT_MUTED);
    private static final Font FONT_SECTION = new Font(Font.HELVETICA, 13, Font.BOLD,   COLOR_WHITE);
    private static final Font FONT_TH      = new Font(Font.HELVETICA,  9, Font.BOLD,   COLOR_PRIMARY);
    private static final Font FONT_TD      = new Font(Font.HELVETICA,  9, Font.NORMAL, COLOR_TEXT_DARK);
    private static final Font FONT_FOOTER  = new Font(Font.HELVETICA,  8, Font.NORMAL, COLOR_TEXT_MUTED);
    private static final Font FONT_BADGE   = new Font(Font.HELVETICA,  8, Font.BOLD,   COLOR_WHITE);

    public void saveTechnicalSheet(String productId, TechnicalSheetDto dto) {
        Product product = findProduct(productId);
        TechnicalSheet sheet = TechnicalSheetMapper.toEntity(dto);
        product.setTechnicalSheet(sheet);
        productRepository.save(product);
    }

    public byte[] generatePdf(String productId) {
        Product product = findProduct(productId);
        if (product.getTechnicalSheet() == null) {
            throw new RuntimeException("No technical sheet found for product: " + productId);
        }
        return buildPdf(product);
    }


    private byte[] buildPdf(Product product) {
        TechnicalSheet sheet = product.getTechnicalSheet();
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            Document doc = new Document(PageSize.A4, 40, 40, 60, 50);
            PdfWriter writer = PdfWriter.getInstance(doc, baos);

            writer.setPageEvent(new FooterEvent(product.getProductName()));

            doc.open();

            addPageHeader(doc, writer, product, sheet, "RAW MATERIALS", "Fiche Matière Première");
            addRawMaterialsTable(doc, sheet.getRawMaterials());

            doc.newPage();
            addPageHeader(doc, writer, product, sheet, "PRODUCTION PROCESS", "Fiche Gamme Opératoire");
            addProductionStepsTable(doc, sheet.getProductionSteps());

            doc.close();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }


    private void addPageHeader(Document doc, PdfWriter writer,
                               Product product, TechnicalSheet sheet,
                               String badge, String subtitle) throws Exception {

        PdfPTable header = new PdfPTable(new float[]{3f, 1f});
        header.setWidthPercentage(100);
        header.setSpacingAfter(16);

        PdfPCell left = new PdfPCell();
        left.setBorder(Rectangle.NO_BORDER);
        left.setPaddingBottom(6);

        PdfPTable logoRow = new PdfPTable(new float[]{0.4f, 2f});
        logoRow.setWidthPercentage(100);

        PdfPCell logoBox = colorCell("", COLOR_PRIMARY, FONT_BADGE, Element.ALIGN_CENTER);
        logoBox.setFixedHeight(36);
        logoBox.setPhrase(new Phrase("DPP\nSMART", new Font(Font.HELVETICA, 7, Font.BOLD, COLOR_WHITE)));
        logoRow.addCell(logoBox);

        PdfPCell logoText = new PdfPCell();
        logoText.setBorder(Rectangle.NO_BORDER);
        logoText.setPaddingLeft(8);
        logoText.setPaddingTop(2);
        logoText.addElement(new Paragraph(product.getProductName() != null ? product.getProductName() : "—", FONT_TITLE));
        if (product.getVariantName() != null) {
            logoText.addElement(new Paragraph(product.getVariantName(), FONT_SUB));
        }
        logoRow.addCell(logoText);

        left.addElement(logoRow);

        Paragraph badgeLine = new Paragraph();
        badgeLine.setSpacingBefore(8);
        Chunk badgeChunk = new Chunk("  " + badge + "  ", FONT_BADGE);
        badgeChunk.setBackground(COLOR_SECONDARY, 4, 3, 4, 3);
        badgeLine.add(badgeChunk);
        badgeLine.add(new Chunk("  " + subtitle, FONT_SUB));
        left.addElement(badgeLine);

        String dateStr = sheet.getDate() != null
                ? sheet.getDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
                : "—";
        String version = sheet.getVersion() != null ? sheet.getVersion() : "1.0";
        String prepBy  = sheet.getPreparedBy() != null ? sheet.getPreparedBy() : "—";

        Paragraph meta = new Paragraph(
                "Date: " + dateStr + "   |   Version: " + version + "   |   Prepared by: " + prepBy,
                new Font(Font.HELVETICA, 8, Font.NORMAL, COLOR_TEXT_MUTED));
        meta.setSpacingBefore(6);
        left.addElement(meta);

        header.addCell(left);

        PdfPCell right = new PdfPCell();
        right.setBorder(Rectangle.BOX);
        right.setBorderColor(COLOR_BORDER);
        right.setPadding(4);
        right.setHorizontalAlignment(Element.ALIGN_CENTER);
        right.setVerticalAlignment(Element.ALIGN_MIDDLE);

        String qrContent = product.getDppUrl() != null
                ? product.getDppUrl()
                : "https://dppsmart.com/passport/" + product.getId();

        try {
            Image qr = generateQrImage(qrContent, 80);
            qr.setAlignment(Image.ALIGN_CENTER);
            right.addElement(qr);
        } catch (Exception ignored) {
            right.addElement(new Paragraph("QR Code", FONT_SUB));
        }
        right.addElement(new Paragraph("Scan for DPP",
                new Font(Font.HELVETICA, 7, Font.NORMAL, COLOR_TEXT_MUTED)));

        header.addCell(right);
        doc.add(header);

        addRule(doc, COLOR_PRIMARY, 1.5f);
    }


    private void addRawMaterialsTable(Document doc, List<RawMaterial> items) throws Exception {
        addSectionTitle(doc, "Raw Materials — Fiche Matière Première");

        String[] headers = {"#", "Material", "Reference", "Supplier", "Qty", "Unit", "Notes"};
        float[]  widths  = {0.4f, 2f, 1.4f, 1.6f, 0.7f, 0.7f, 2.2f};

        PdfPTable table = buildTable(widths);
        for (String h : headers) addHeaderCell(table, h);

        int row = 0;
        for (RawMaterial rm : items) {
            Color bg = (row++ % 2 == 0) ? COLOR_WHITE : COLOR_ROW_ALT;
            addDataCell(table, String.valueOf(row), bg, Element.ALIGN_CENTER);
            addDataCell(table, safe(rm.getName()),      bg, Element.ALIGN_LEFT);
            addDataCell(table, safe(rm.getReference()), bg, Element.ALIGN_LEFT);
            addDataCell(table, safe(rm.getSupplier()),  bg, Element.ALIGN_LEFT);
            addDataCell(table, rm.getQuantity() != null ? String.valueOf(rm.getQuantity()) : "—", bg, Element.ALIGN_CENTER);
            addDataCell(table, safe(rm.getUnit()),      bg, Element.ALIGN_CENTER);
            addDataCell(table, safe(rm.getNotes()),     bg, Element.ALIGN_LEFT);
        }

        doc.add(table);
        addSummaryBadge(doc, items.size() + " material(s) listed");
    }


    private void addProductionStepsTable(Document doc, List<ProductionStep> steps) throws Exception {
        addSectionTitle(doc, "Production Process — Fiche Gamme Opératoire");

        String[] headers = {"#", "Step Name", "Description", "Machine", "Operator", "Duration (min)", "Quality Check"};
        float[]  widths  = {0.4f, 1.8f, 2f, 1.4f, 1.4f, 1.2f, 1.6f};

        PdfPTable table = buildTable(widths);
        for (String h : headers) addHeaderCell(table, h);

        int row = 0;
        for (ProductionStep step : steps) {
            Color bg = (row++ % 2 == 0) ? COLOR_WHITE : COLOR_ROW_ALT;
            addDataCell(table, String.valueOf(step.getOrderIndex() > 0 ? step.getOrderIndex() : row), bg, Element.ALIGN_CENTER);
            addDataCell(table, safe(step.getStepName()),       bg, Element.ALIGN_LEFT);
            addDataCell(table, safe(step.getDescription()),    bg, Element.ALIGN_LEFT);
            addDataCell(table, safe(step.getMachine()),        bg, Element.ALIGN_LEFT);
            addDataCell(table, safe(step.getOperator()),       bg, Element.ALIGN_LEFT);
            addDataCell(table, step.getDurationMinutes() != null ? String.valueOf(step.getDurationMinutes()) : "—", bg, Element.ALIGN_CENTER);
            addDataCell(table, safe(step.getQualityCheck()),   bg, Element.ALIGN_LEFT);
        }

        doc.add(table);
        addSummaryBadge(doc, steps.size() + " step(s) defined");
    }


    private PdfPTable buildTable(float[] widths) throws Exception {
        PdfPTable table = new PdfPTable(widths);
        table.setWidthPercentage(100);
        table.setSpacingBefore(8);
        table.setSpacingAfter(12);
        table.setHeaderRows(1);
        return table;
    }

    private void addHeaderCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, FONT_TH));
        cell.setBackgroundColor(COLOR_HEADER_BG);
        cell.setBorderColor(COLOR_BORDER);
        cell.setBorderWidth(0.5f);
        cell.setPadding(6);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(cell);
    }

    private void addDataCell(PdfPTable table, String text, Color bg, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, FONT_TD));
        cell.setBackgroundColor(bg);
        cell.setBorderColor(COLOR_BORDER);
        cell.setBorderWidth(0.5f);
        cell.setPadding(5);
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private PdfPCell colorCell(String text, Color bg, Font font, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(4);
        return cell;
    }

    private void addSectionTitle(Document doc, String title) throws Exception {
        PdfPTable bar = new PdfPTable(1);
        bar.setWidthPercentage(100);
        bar.setSpacingBefore(4);
        bar.setSpacingAfter(2);
        PdfPCell cell = new PdfPCell(new Phrase("  " + title, FONT_SECTION));
        cell.setBackgroundColor(COLOR_PRIMARY);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(8);
        bar.addCell(cell);
        doc.add(bar);
    }

    private void addRule(Document doc, Color color, float width) throws Exception {
        PdfPTable rule = new PdfPTable(1);
        rule.setWidthPercentage(100);
        rule.setSpacingAfter(8);
        PdfPCell cell = new PdfPCell();
        cell.setBorderWidthBottom(width);
        cell.setBorderColorBottom(color);
        cell.setBorderWidthTop(0);
        cell.setBorderWidthLeft(0);
        cell.setBorderWidthRight(0);
        cell.setFixedHeight(1);
        rule.addCell(cell);
        doc.add(rule);
    }

    private void addSummaryBadge(Document doc, String text) throws Exception {
        Paragraph p = new Paragraph();
        p.setSpacingBefore(4);
        p.setSpacingAfter(8);
        Chunk chunk = new Chunk("  " + text + "  ", new Font(Font.HELVETICA, 8, Font.BOLD, COLOR_PRIMARY));
        chunk.setBackground(COLOR_HEADER_BG, 4, 3, 4, 3);
        p.add(chunk);
        doc.add(p);
    }

    private Image generateQrImage(String content, int size) throws Exception {
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.MARGIN, 1);
        BitMatrix matrix = new MultiFormatWriter()
                .encode(content, BarcodeFormat.QR_CODE, size, size, hints);
        BufferedImage buffered = MatrixToImageWriter.toBufferedImage(matrix);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(buffered, "PNG", baos);
        return Image.getInstance(baos.toByteArray());
    }

    private String safe(String value) {
        return value != null && !value.isBlank() ? value : "—";
    }

    private Product findProduct(String id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
    }


    private static class FooterEvent extends PdfPageEventHelper {

        private final String productName;

        FooterEvent(String productName) {
            this.productName = productName != null ? productName : "";
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            cb.saveState();

            cb.beginText();
            try {
                cb.setFontAndSize(BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, false), 7);
            } catch (Exception e) {
                cb.endText();
                cb.restoreState();
                return;
            }
            cb.setColorFill(COLOR_TEXT_MUTED);
            cb.showTextAligned(Element.ALIGN_LEFT, "Technical Sheet — " + productName,
                    document.left(), document.bottom() - 14, 0);

            cb.showTextAligned(Element.ALIGN_RIGHT,
                    "Page " + writer.getPageNumber() + " / 2",
                    document.right(), document.bottom() - 14, 0);
            cb.endText();

            cb.setColorStroke(COLOR_BORDER);
            cb.setLineWidth(0.5f);
            cb.moveTo(document.left(), document.bottom() - 6);
            cb.lineTo(document.right(), document.bottom() - 6);
            cb.stroke();

            cb.restoreState();
        }
    }
}
