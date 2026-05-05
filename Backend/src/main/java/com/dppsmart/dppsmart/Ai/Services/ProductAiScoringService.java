package com.dppsmart.dppsmart.Ai.Services;

import com.dppsmart.dppsmart.Ai.DTO.ProductAiScoreDto;
import com.dppsmart.dppsmart.Product.Entities.Product;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductAiScoringService {

    public ProductAiScoreDto scoreProduct(Product p) {
        List<String> missing = new ArrayList<>();

        if (isBlank(p.getProductName())) missing.add("productName");
        if (isBlank(p.getCompanyName())) missing.add("companyName");
        if (isBlank(p.getSku())) missing.add("sku");
        if (isBlank(p.getVariantName())) missing.add("variantName");
        if (isBlank(p.getEndOfLifeInstructions())) missing.add("endOfLifeInstructions");
        if (isBlank(p.getOrganizationId())) missing.add("organizationId");
        if (p.getMaterialsComposition() == null || p.getMaterialsComposition().isEmpty()) missing.add("materialsComposition");
        if (p.getExtraFields() == null || p.getExtraFields().isEmpty()) missing.add("extraFields");

        int totalSignals = 8;
        int present = Math.max(0, totalSignals - missing.size());
        int score = (int) Math.round((present * 100.0) / totalSignals);

        String summary;
        if (score >= 85) summary = "Great DPP completeness. Minor improvements possible.";
        else if (score >= 60) summary = "Good start. Fill missing DPP fields to improve quality.";
        else summary = "Low completeness. Add core product + production data for a better DPP.";

        return new ProductAiScoreDto(score, missing, summary);
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
