package com.dppsmart.dppsmart.Security.Sanitization;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(1)
public class XssFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(XssFilter.class);
    private static final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return pathMatcher.match("/ws/**", request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String contentType = request.getContentType();
        boolean hasBody = contentType != null
                && (contentType.contains("application/json")
                || contentType.contains("text/")
                || contentType.contains("application/x-www-form-urlencoded"));

        if (hasBody) {
            XssRequestWrapper wrapped = new XssRequestWrapper(request);

            String rawQuery = request.getQueryString();
            if (rawQuery != null && XssSanitizer.containsSuspiciousPatterns(rawQuery)) {
                log.warn("XSS attempt in query string from IP={} path={}",
                        request.getRemoteAddr(), request.getRequestURI());
            }

            chain.doFilter(wrapped, response);
        } else {
            chain.doFilter(request, response);
        }
    }
}
