package com.dppsmart.dppsmart.Ai.Services;

import com.dppsmart.dppsmart.Ai.DTO.ProductAiScoreDto;
import com.dppsmart.dppsmart.Product.Entities.Product;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ProductAiScoringService {

    public ProductAiScoreDto scoreProduct(Product p) {
        List<String> missing = new ArrayList<>();

        if (isBlank(p.getProductName())) missing.add("productName");
        if (isBlank(p.getCategory())) missing.add("category");
        if (isBlank(p.getMaterial())) missing.add("material");
        if (isBlank(p.getCertification())) missing.add("certification");
        if (isBlank(p.getOrganizationId())) missing.add("organizationId");
        if (p.getProductionSteps() == null || p.getProductionSteps().isEmpty()) missing.add("productionSteps");

        Map<String, Object> additional = p.getAdditionalInfo();
        if (additional == null || additional.isEmpty()) {
            missing.add("additionalInfo");
        } else {
            if (!additional.containsKey("origin")) missing.add("additionalInfo.origin");
            if (!additional.containsKey("care")) missing.add("additionalInfo.care");
            if (!additional.containsKey("composition")) missing.add("additionalInfo.composition");
        }

        int totalSignals = 10;
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

