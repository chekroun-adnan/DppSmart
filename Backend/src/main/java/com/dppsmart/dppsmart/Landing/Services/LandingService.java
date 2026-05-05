package com.dppsmart.dppsmart.Landing.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Landing.DTO.ContactRequestDto;
import com.dppsmart.dppsmart.Landing.DTO.LandingResponseDto;
import com.dppsmart.dppsmart.Landing.DTO.LandingStatsDto;
import com.dppsmart.dppsmart.Landing.DTO.TopScannedProductDto;
import com.dppsmart.dppsmart.Landing.Entities.ContactLead;
import com.dppsmart.dppsmart.Landing.Repositories.ContactLeadRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Scan.Entities.ScanEvent;
import com.dppsmart.dppsmart.Scan.Repositories.ScanEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class LandingService {
    private final ProductRepository productRepository;
    private final ScanEventRepository scanEventRepository;
    private final ContactLeadRepository contactLeadRepository;
    private final OrganizationRepository organizationRepository;


    public LandingResponseDto getLanding() {
        LandingStatsDto stats = new LandingStatsDto();
        stats.setTotalOrganizations(organizationRepository.count());
        stats.setTotalProducts(productRepository.count());
        stats.setTotalScans(scanEventRepository.count());
        stats.setScansLast24h(scanEventRepository.countByScannedAtAfter(LocalDateTime.now().minusHours(24)));

        LandingResponseDto resp = new LandingResponseDto();
        resp.setStats(stats);
        resp.setTopScannedProducts(getTopScannedProductsLast30Days(5));
        return resp;
    }

    public void createContactLead(ContactRequestDto dto, HttpServletRequest request) {
        ContactLead lead = new ContactLead();
        lead.setId(NanoIdUtils.randomNanoId());
        lead.setName(dto.getName());
        lead.setEmail(dto.getEmail());
        lead.setCompany(dto.getCompany());
        lead.setMessage(dto.getMessage());
        lead.setIp(extractIp(request));
        lead.setUserAgent(request != null ? request.getHeader("User-Agent") : null);
        lead.setCreatedAt(LocalDateTime.now());
        contactLeadRepository.save(lead);
    }

    private List<TopScannedProductDto> getTopScannedProductsLast30Days(int limit) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        List<ScanEvent> events = scanEventRepository.findByScannedAtAfter(cutoff);

        Map<String, Long> counts = new HashMap<>();
        for (ScanEvent e : events) {
            if (e.getProductId() == null || e.getProductId().isBlank()) continue;
            counts.merge(e.getProductId(), 1L, Long::sum);
        }

        List<Map.Entry<String, Long>> top = counts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(limit)
                .toList();

        if (top.isEmpty()) return List.of();

        Map<String, Product> productsById = new HashMap<>();
        productRepository.findAllById(top.stream().map(Map.Entry::getKey).toList())
                .forEach(p -> productsById.put(p.getId(), p));

        List<TopScannedProductDto> result = new ArrayList<>();
        for (Map.Entry<String, Long> entry : top) {
            Product p = productsById.get(entry.getKey());
            if (p == null) continue;

            TopScannedProductDto dto = new TopScannedProductDto();
            dto.setProductId(p.getId());
            dto.setProductName(p.getProductName());
            dto.setQrUrl(p.getQrUrl());
            dto.setDppUrl(p.getDppUrl());
            dto.setScanCount(entry.getValue());
            result.add(dto);
        }

        return result;
    }

    private String extractIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return request.getRemoteAddr();
    }
}

