package com.dppsmart.dppsmart.Security.RateLimit;

import com.dppsmart.dppsmart.Security.Session.DeviceParser;
import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;


@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiterService limiterService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String path   = request.getRequestURI();
        String method = request.getMethod();
        String ip     = DeviceParser.extractIp(request);

        RateLimiterService.BucketType type = resolveBucketType(path, method);
        if (type == null) {
            chain.doFilter(request, response);
            return;
        }

        try {
            limiterService.consume(type, ip);
            long remaining = limiterService.remaining(type, ip);
            response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
            chain.doFilter(request, response);
        } catch (RateLimitException ex) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(ex.getRetryAfterSeconds()));
            response.setHeader("X-RateLimit-Remaining", "0");

            Map<String, Object> body = Map.of(
                    "code",      "RATE_LIMIT_EXCEEDED",
                    "message",   ex.getMessage(),
                    "retryAfter", ex.getRetryAfterSeconds(),
                    "timestamp", Instant.now().toString()
            );
            objectMapper.writeValue(response.getWriter(), body);
        }
    }

    private RateLimiterService.BucketType resolveBucketType(String path, String method) {
        if (path.equals("/auth/login")
                || path.equals("/auth/register")
                || path.equals("/auth/refresh")
                || path.startsWith("/auth/forgot-password")
                || path.startsWith("/auth/reset-password")) {
            return RateLimiterService.BucketType.AUTH;
        }

        if (path.startsWith("/api/ai/public/")) {
            return RateLimiterService.BucketType.AI;
        }

        if (("POST".equalsIgnoreCase(method) && path.equals("/api/scans"))
                || path.matches("/api/products/[^/]+/dpp")
                || path.startsWith("/api/public/")) {
            return RateLimiterService.BucketType.PUBLIC;
        }

        return null;
    }
}
