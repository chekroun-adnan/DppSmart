package com.dppsmart.dppsmart.Billing.Services;

import com.dppsmart.dppsmart.Billing.DTO.InvoiceDto;
import com.dppsmart.dppsmart.Billing.DTO.InvoiceLineItemDto;
import com.dppsmart.dppsmart.Billing.Enums.InvoiceStatus;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.Rectangle;
import org.springframework.stereotype.Component;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
public class InvoicePdfGenerator {

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 22, Font.BOLD, new Color(30, 64, 175));
    private static final Font HEADING_FONT = new Font(Font.HELVETICA, 14, Font.BOLD, new Color(30, 64, 175));
    private static final Font SUB_HEADING_FONT = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(100, 116, 139));
    private static final Font NORMAL_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(51, 65, 85));
    private static final Font BOLD_FONT = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(51, 65, 85));
    private static final Font STATUS_FONT = new Font(Font.HELVETICA, 11, Font.BOLD, new Color(255, 255, 255));
    private static final Color HEADER_BG = new Color(30, 64, 175);

    public byte[] generatePdf(InvoiceDto dto, String companyName, String companyAddress,
                               String clientName, String clientAddress) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            Document document = new Document(PageSize.A4, 36, 36, 36, 120);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            
            String generatedBy = dto.getCreatedBy() != null ? dto.getCreatedBy() : "System";
            LocalDate generatedOn = LocalDate.now();
            writer.setPageEvent(new FooterEvent(generatedBy, generatedOn));
            
            document.open();

            String currency = dto.getCurrency() != null ? dto.getCurrency() : "MAD";

            addHeader(document, dto, companyName, companyAddress);
            addClientInfo(document, clientName, clientAddress, dto);
            addBillingMode(document, dto);
            addShippingInfo(document, dto);
            addLineSections(document, dto, currency);
            addSummary(document, dto, currency);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF invoice", e);
        }
        return out.toByteArray();
    }

    private void addHeader(Document doc, InvoiceDto dto, String companyName, String companyAddress) throws DocumentException {
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{3, 2});

        PdfPCell left = new PdfPCell();
        left.setBorder(Rectangle.NO_BORDER);
        left.addElement(new Paragraph("Atelier IKS S.A.", TITLE_FONT));
        left.addElement(new Paragraph("Lot 104, Z.I. Sidi Ghanem", NORMAL_FONT));
        left.addElement(new Paragraph("Route de Safi, 40000 Marrakech", NORMAL_FONT));
        left.addElement(new Paragraph(" "));
        header.addCell(left);

        PdfPCell right = new PdfPCell();
        right.setBorder(Rectangle.NO_BORDER);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        right.addElement(new Paragraph("INVOICE", new Font(Font.HELVETICA, 18, Font.BOLD, new Color(30, 64, 175))));
        right.addElement(new Paragraph("#" + dto.getInvoiceNumber(), BOLD_FONT));
        if (dto.getOrderId() != null) {
            right.addElement(new Paragraph("Order: " + dto.getOrderId(), NORMAL_FONT));
        }
        right.addElement(new Paragraph("Currency: " + (dto.getCurrency() != null ? dto.getCurrency() : "MAD"), NORMAL_FONT));
        right.addElement(new Paragraph(" "));

        String statusLabel = dto.getStatus() != null ? dto.getStatus().name() : "DRAFT";
        Color statusBg = getStatusColor(dto.getStatus());
        Chunk statusChunk = new Chunk(" " + statusLabel + " ");
        statusChunk.setBackground(statusBg);
        statusChunk.setFont(STATUS_FONT);
        Paragraph statusP = new Paragraph(statusChunk);
        statusP.setAlignment(Element.ALIGN_RIGHT);
        right.addElement(statusP);
        header.addCell(right);

        doc.add(header);
        doc.add(new Paragraph(" "));
    }

    private void addClientInfo(Document doc, String clientName, String clientAddress, InvoiceDto dto) throws DocumentException {
        PdfPTable info = new PdfPTable(2);
        info.setWidthPercentage(100);
        info.setWidths(new float[]{1, 1});

        PdfPCell billTo = new PdfPCell();
        billTo.setBorder(Rectangle.NO_BORDER);
        billTo.addElement(new Paragraph("Bill To", HEADING_FONT));
        billTo.addElement(new Paragraph(clientName != null ? clientName : "N/A", BOLD_FONT));
        billTo.addElement(new Paragraph(clientAddress != null ? clientAddress : "", NORMAL_FONT));
        info.addCell(billTo);

        PdfPCell dates = new PdfPCell();
        dates.setBorder(Rectangle.NO_BORDER);
        dates.setHorizontalAlignment(Element.ALIGN_RIGHT);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM dd, yyyy");
        if (dto.getIssueDate() != null) {
            dates.addElement(new Paragraph("Issue Date: " + dto.getIssueDate().format(fmt), NORMAL_FONT));
        }
        if (dto.getDueDate() != null) {
            dates.addElement(new Paragraph("Due Date: " + dto.getDueDate().format(fmt), NORMAL_FONT));
        }
        info.addCell(dates);

        doc.add(info);
        doc.add(new Paragraph(" "));
    }

    private void addBillingMode(Document doc, InvoiceDto dto) throws DocumentException {
        if (dto.getManufacturingMode() == null || dto.getManufacturingMode().isBlank()) {
            return;
        }
        String label = "CLIENT_SUPPLIED_MATERIALS".equals(dto.getManufacturingMode())
                ? "Billing Mode: Client Supplies Materials (production services only)"
                : "Billing Mode: Company Supplies Materials (materials + production)";
        doc.add(new Paragraph(label, SUB_HEADING_FONT));
        doc.add(new Paragraph(" "));
    }

    private void addShippingInfo(Document doc, InvoiceDto dto) throws DocumentException {
        if (dto.getExpeditionStatus() == null || dto.getExpeditionStatus().isBlank()) {
            return;
        }

        doc.add(new Paragraph("Shipping / Expedition", HEADING_FONT));
        
        PdfPTable info = new PdfPTable(2);
        info.setWidthPercentage(100);
        info.setWidths(new float[]{1, 1});
        info.setSpacingBefore(10f);

        PdfPCell left = new PdfPCell();
        left.setBorder(Rectangle.NO_BORDER);
        left.addElement(new Paragraph("Expedition Status : " + dto.getExpeditionStatus(), NORMAL_FONT));
        if (dto.getShipmentDate() != null) {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            left.addElement(new Paragraph("Shipment Date     : " + dto.getShipmentDate().format(fmt), NORMAL_FONT));
        } else {
            left.addElement(new Paragraph("Shipment Date     : Pending", NORMAL_FONT));
        }
        info.addCell(left);

        PdfPCell right = new PdfPCell();
        right.setBorder(Rectangle.NO_BORDER);
        right.addElement(new Paragraph("Products Shipped  : " + (dto.getShippedQuantity() != null ? dto.getShippedQuantity() : 0), NORMAL_FONT));
        right.addElement(new Paragraph("Total Boxes       : " + (dto.getTotalBoxes() != null ? dto.getTotalBoxes() : 0), NORMAL_FONT));
        info.addCell(right);

        doc.add(info);

        if (dto.getBoxSummaries() != null && !dto.getBoxSummaries().isEmpty()) {
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("Boxes Used", BOLD_FONT));
            doc.add(new Paragraph("---------------------------------------", NORMAL_FONT));
            
            for (com.dppsmart.dppsmart.Billing.DTO.BoxTypeSummary summary : dto.getBoxSummaries()) {
                String line = String.format("%-24s x%d", summary.getBoxType(), summary.getQuantity());
                doc.add(new Paragraph(line, NORMAL_FONT));
            }
        }
        doc.add(new Paragraph(" "));
    }

    private void addLineSections(Document doc, InvoiceDto dto, String currency) throws DocumentException {
        List<InvoiceLineItemDto> items = dto.getItems() != null ? dto.getItems() : List.of();
        List<InvoiceLineItemDto> materialItems = new ArrayList<>();
        List<InvoiceLineItemDto> productionItems = new ArrayList<>();

        for (InvoiceLineItemDto item : items) {
            if ("MATERIAL".equals(item.getItemType())) {
                materialItems.add(item);
            } else {
                productionItems.add(item);
            }
        }

        boolean isClientSupplied = "CLIENT_SUPPLIED_MATERIALS".equals(dto.getManufacturingMode());

        if (!materialItems.isEmpty()) {
            doc.add(new Paragraph("Materials", HEADING_FONT));
            addMaterialTable(doc, materialItems, currency, isClientSupplied);
            doc.add(new Paragraph(" "));
        }

        doc.add(new Paragraph("Production Services", HEADING_FONT));
        if (productionItems.isEmpty()) {
            doc.add(new Paragraph("No production line items.", NORMAL_FONT));
        } else {
            addProductionTable(doc, productionItems, currency, sumTotals(productionItems));
        }
        doc.add(new Paragraph(" "));
    }

    private void addMaterialTable(Document doc, List<InvoiceLineItemDto> items, String currency,
                                   boolean isClientSupplied) throws DocumentException {
        int colCount = 5;
        PdfPTable table = new PdfPTable(colCount);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3, 1.5f, 1.5f, 1.5f, 1.5f});
        table.setHeaderRows(1);

        Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);
        String[] headers = new String[]{"Material", "Source", "Qty Used", "Unit Price", "Total"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(HEADER_BG);
            cell.setPadding(6);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }

        for (InvoiceLineItemDto item : items) {
            table.addCell(createCell(item.getProductName() != null ? item.getProductName() : "—", Element.ALIGN_LEFT));
            
            boolean clientSupplied = item.getClientSuppliedMaterials() != null && item.getClientSuppliedMaterials();
            table.addCell(createCell(clientSupplied ? "Client" : "Company", Element.ALIGN_CENTER));
            
            String qtyStr = (item.getQuantity() != null ? String.valueOf(item.getQuantity()) : "0") + " " + (item.getUnit() != null ? item.getUnit() : "");
            table.addCell(createCell(qtyStr.trim(), Element.ALIGN_CENTER));
            
            table.addCell(createCell(clientSupplied ? "—" : formatPrice(item.getUnitPrice(), currency), Element.ALIGN_RIGHT));
            table.addCell(createCell(clientSupplied ? "—" : formatPrice(item.getTotalPrice(), currency), Element.ALIGN_RIGHT));
        }

        double sectionTotal = items.stream()
                .mapToDouble(i -> i.getTotalPrice() != null ? i.getTotalPrice() : 0)
                .sum();
        
        PdfPCell footerLabel = new PdfPCell(new Phrase("Material Total", BOLD_FONT));
        footerLabel.setColspan(4);
        footerLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        footerLabel.setBackgroundColor(new Color(241, 245, 249));
        footerLabel.setPadding(6);
        table.addCell(footerLabel);
        
        PdfPCell footerVal = new PdfPCell(new Phrase(formatPrice(sectionTotal, currency), BOLD_FONT));
        footerVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        footerVal.setBackgroundColor(new Color(241, 245, 249));
        footerVal.setPadding(6);
        table.addCell(footerVal);

        doc.add(table);
    }

    private double sumTotals(List<InvoiceLineItemDto> items) {
        return items.stream()
                .mapToDouble(i -> i.getTotalPrice() != null ? i.getTotalPrice() : 0)
                .sum();
    }

    private void addProductionTable(Document doc, List<InvoiceLineItemDto> items, String currency,
                                    double sectionTotal) throws DocumentException {
        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2.5f, 0.8f, 1.2f, 1.2f, 1.3f});
        table.setHeaderRows(1);

        Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);
        for (String h : new String[]{"Operation", "Qty", "Time/Product", "Cost/Unit", "Total"}) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(HEADER_BG);
            cell.setPadding(6);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }

        for (InvoiceLineItemDto item : items) {
            table.addCell(createCell(item.getProductName() != null ? item.getProductName() : "—", Element.ALIGN_LEFT));
            table.addCell(createCell(String.valueOf(item.getQuantity() != null ? item.getQuantity() : 0), Element.ALIGN_CENTER));
            String timePerProduct = item.getDurationPerUnit() != null
                    ? item.getDurationPerUnit() + " min" : "—";
            table.addCell(createCell(timePerProduct, Element.ALIGN_CENTER));
            table.addCell(createCell(item.getUnitPrice() != null
                    ? formatPrice(item.getUnitPrice(), currency) : "—", Element.ALIGN_RIGHT));
            table.addCell(createCell(formatPrice(item.getTotalPrice(), currency), Element.ALIGN_RIGHT));
        }

        if (sectionTotal > 0) {
            PdfPCell footerLabel = new PdfPCell(new Phrase("Production Total", BOLD_FONT));
            footerLabel.setColspan(4);
            footerLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
            footerLabel.setBackgroundColor(new Color(241, 245, 249));
            footerLabel.setPadding(6);
            table.addCell(footerLabel);
            PdfPCell footerVal = new PdfPCell(new Phrase(formatPrice(sectionTotal, currency), BOLD_FONT));
            footerVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            footerVal.setBackgroundColor(new Color(241, 245, 249));
            footerVal.setPadding(6);
            table.addCell(footerVal);
        }

        doc.add(table);
    }

    private void addSummary(Document doc, InvoiceDto dto, String currency) throws DocumentException {
        PdfPTable summary = new PdfPTable(2);
        summary.setWidthPercentage(45);
        summary.setHorizontalAlignment(Element.ALIGN_RIGHT);

        if (dto.getTotalMaterialCost() != null && dto.getTotalMaterialCost() > 0) {
            addSummaryRow(summary, "Material Cost", dto.getTotalMaterialCost(), currency);
        }
        if (dto.getTotalProductionCost() != null && dto.getTotalProductionCost() > 0) {
            addSummaryRow(summary, "Production Cost", dto.getTotalProductionCost(), currency);
        }
        addSummaryRow(summary, "Subtotal", dto.getSubtotal(), currency);
        if (dto.getDiscountPercent() != null && dto.getDiscountPercent() > 0) {
            addSummaryRow(summary, "Discount (" + dto.getDiscountPercent() + "%)",
                    dto.getDiscountAmount() != null ? -dto.getDiscountAmount() : 0, currency);
        }
        addSummaryRow(summary, "Tax (" + (dto.getTaxRate() != null ? dto.getTaxRate() : 0) + "%)",
                dto.getTaxAmount(), currency);

        PdfPCell totalLabel = new PdfPCell(new Phrase("Grand Total", new Font(Font.HELVETICA, 12, Font.BOLD, new Color(30, 64, 175))));
        totalLabel.setBorder(Rectangle.TOP);
        totalLabel.setPaddingTop(6);
        summary.addCell(totalLabel);

        PdfPCell totalVal = new PdfPCell(new Phrase(formatPrice(dto.getTotal(), currency),
                new Font(Font.HELVETICA, 12, Font.BOLD, new Color(30, 64, 175))));
        totalVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        totalVal.setBorder(Rectangle.TOP);
        totalVal.setPaddingTop(6);
        summary.addCell(totalVal);

        if (dto.getAmountPaid() != null && dto.getAmountPaid() > 0) {
            addSummaryRow(summary, "Paid", -dto.getAmountPaid(), currency);
            double remaining = (dto.getTotal() != null ? dto.getTotal() : 0) - dto.getAmountPaid();
            addSummaryRow(summary, "Balance Due", remaining, currency);
        }

        doc.add(summary);
        
        if (dto.getAmountInWords() != null) {
            doc.add(new Paragraph(" "));
            Paragraph amountInWordsLabel = new Paragraph("Montant en lettres :", BOLD_FONT);
            amountInWordsLabel.setAlignment(Element.ALIGN_LEFT);
            doc.add(amountInWordsLabel);
            
            Paragraph amountInWordsText = new Paragraph(dto.getAmountInWords(), NORMAL_FONT);
            amountInWordsText.setAlignment(Element.ALIGN_LEFT);
            doc.add(amountInWordsText);
        }
    }

    private void addSummaryRow(PdfPTable table, String label, Double value, String currency) {
        table.addCell(new Phrase(label, NORMAL_FONT));
        PdfPCell cell = new PdfPCell(new Phrase(formatPrice(value, currency), BOLD_FONT));
        cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(cell);
    }

    private PdfPCell createCell(String text, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, NORMAL_FONT));
        cell.setPadding(5);
        cell.setHorizontalAlignment(alignment);
        return cell;
    }

    private String formatPrice(Double value, String currency) {
        if (value == null) value = 0.0;
        String cur = currency != null ? currency : "MAD";
        return String.format("%.2f %s", value, cur);
    }

    private Color getStatusColor(InvoiceStatus status) {
        if (status == null) return Color.GRAY;
        switch (status) {
            case DRAFT: return new Color(156, 163, 175);
            case SENT: return new Color(59, 130, 246);
            case PARTIALLY_PAID: return new Color(245, 158, 11);
            case PAID: return new Color(34, 197, 94);
            case OVERDUE: return new Color(239, 68, 68);
            case CANCELLED: return new Color(148, 163, 184);
            default: return Color.GRAY;
        }
    }

    class FooterEvent extends PdfPageEventHelper {
        private final String generatedBy;
        private final LocalDate generatedOn;

        public FooterEvent(String generatedBy, LocalDate generatedOn) {
            this.generatedBy = generatedBy;
            this.generatedOn = generatedOn;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            try {
                Rectangle page = document.getPageSize();
                PdfPTable footer = new PdfPTable(4);
                footer.setTotalWidth(page.getWidth() - document.leftMargin() - document.rightMargin());
                footer.setWidths(new float[]{1.5f, 1f, 1f, 1f});

                Font footerFont = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(100, 116, 139));
                Font footerBold = new Font(Font.HELVETICA, 8, Font.BOLD, new Color(100, 116, 139));

                PdfPCell c1 = new PdfPCell();
                c1.setBorder(Rectangle.TOP);
                c1.setBorderColor(new Color(200, 200, 200));
                c1.setPaddingTop(5);
                c1.addElement(new Paragraph("Atelier IKS S.A.", footerBold));
                c1.addElement(new Paragraph("Lot 104, Z.I. Sidi Ghanem", footerFont));
                c1.addElement(new Paragraph("Route de Safi, 40000 Marrakech", footerFont));
                c1.addElement(new Paragraph("contact@atelieriks.ma", footerFont));
                c1.addElement(new Paragraph("+212 5 24 33 55 66", footerFont));
                footer.addCell(c1);

                PdfPCell c2 = new PdfPCell();
                c2.setBorder(Rectangle.TOP);
                c2.setBorderColor(new Color(200, 200, 200));
                c2.setPaddingTop(5);
                c2.addElement(new Paragraph("Legal Information", footerBold));
                c2.addElement(new Paragraph("ICE: 000086914000043", footerFont));
                c2.addElement(new Paragraph("RC: 45/6897", footerFont));
                c2.addElement(new Paragraph("IF: 06511234", footerFont));
                c2.addElement(new Paragraph("Patente: 45112345", footerFont));
                footer.addCell(c2);

                PdfPCell c3 = new PdfPCell();
                c3.setBorder(Rectangle.TOP);
                c3.setBorderColor(new Color(200, 200, 200));
                c3.setPaddingTop(5);
                c3.addElement(new Paragraph("Banking Information", footerBold));
                c3.addElement(new Paragraph("Attijariwafa Bank", footerFont));
                c3.addElement(new Paragraph("IBAN: MA64 0077 8899 0000 1111 2222", footerFont));
                c3.addElement(new Paragraph("SWIFT: ATWWMA", footerFont));
                footer.addCell(c3);

                PdfPCell c4 = new PdfPCell();
                c4.setBorder(Rectangle.TOP);
                c4.setBorderColor(new Color(200, 200, 200));
                c4.setPaddingTop(5);
                c4.addElement(new Paragraph("Document", footerBold));
                c4.addElement(new Paragraph("Generated: " + generatedOn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), footerFont));
                c4.addElement(new Paragraph("By: " + generatedBy, footerFont));
                c4.addElement(new Paragraph(String.format("Page %d", writer.getPageNumber()), footerFont));
                footer.addCell(c4);

                footer.writeSelectedRows(0, -1, document.leftMargin(), document.bottomMargin() - 10, writer.getDirectContent());
            } catch (Exception e) {
            }
        }
    }
}
