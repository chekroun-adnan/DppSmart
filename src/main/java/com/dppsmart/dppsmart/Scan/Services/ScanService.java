package com.dppsmart.dppsmart.Scan.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Scan.DTO.CreateScanEventDto;
import com.dppsmart.dppsmart.Scan.DTO.ScanEventResponseDto;
import com.dppsmart.dppsmart.Scan.Entities.ScanEvent;
import com.dppsmart.dppsmart.Scan.Mapper.ScanEventMapper;
import com.dppsmart.dppsmart.Scan.Repositories.ScanEventRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScanService {
    private final ScanEventRepository scanEventRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public ScanEventResponseDto recordScan(CreateScanEventDto dto, HttpServletRequest request) {
        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new NotFoundException("Product not found"));

        ScanEvent event = baseEvent(dto.getProductId(), product.getOrganizationId(), request);
        event.setLatitude(dto.getLatitude());
        event.setLongitude(dto.getLongitude());
        event.setLocationText(dto.getLocationText());

        return ScanEventMapper.toDto(scanEventRepository.save(event));
    }

    public void recordDppOpen(String productId, HttpServletRequest request) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return; // DPP endpoint will already return 404; avoid masking it.

        ScanEvent event = baseEvent(productId, product.getOrganizationId(), request);
        scanEventRepository.save(event);
    }

    public List<ScanEventResponseDto> getByProduct(String productId) {
        User user = requireUser();
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found"));
        if (!permissionService.canAccessOrganization(user, product.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to access scans for this product");
        }
        return scanEventRepository.findByProductIdOrderByScannedAtDesc(productId)
                .stream()
                .map(ScanEventMapper::toDto)
                .toList();
    }

    public List<ScanEventResponseDto> getByOrganization(String organizationId) {
        User user = requireUser();
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("You are not allowed to access scans for this organization");
        }
        return scanEventRepository.findByOrganizationIdOrderByScannedAtDesc(organizationId)
                .stream()
                .map(ScanEventMapper::toDto)
                .toList();
    }

    private ScanEvent baseEvent(String productId, String organizationId, HttpServletRequest request) {
        ScanEvent event = new ScanEvent();
        event.setId(NanoIdUtils.randomNanoId());
        event.setProductId(productId);
        event.setOrganizationId(organizationId);
        event.setScannedAt(LocalDateTime.now());
        event.setScannedUrl(request != null ? request.getRequestURL().toString() : null);
        event.setIp(extractIp(request));
        event.setUserAgent(request != null ? request.getHeader("User-Agent") : null);
        event.setReferer(request != null ? request.getHeader("Referer") : null);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            event.setScannedByUserEmail(auth.getName());
        }
        return event;
    }

    private String extractIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // first IP in chain
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return request.getRemoteAddr();
    }

    private User requireUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}

