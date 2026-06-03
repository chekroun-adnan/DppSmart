package com.dppsmart.dppsmart.Security.Injection;

import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.regex.Pattern;

@Component
@Order(2)
public class MongoInjectionFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(MongoInjectionFilter.class);
    private static final AntPathMatcher pathMatcher = new AntPathMatcher();

    private static final Pattern MONGO_OPERATOR = Pattern.compile(
            "\\$(?:ne|gt|gte|lt|lte|in|nin|or|and|not|nor|exists|type|mod|regex|where|all|elemMatch|size|slice|expr|jsonSchema|text|comment|meta|rand|natural)",
            Pattern.CASE_INSENSITIVE
    );

    private final ObjectMapper objectMapper;

    public MongoInjectionFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return pathMatcher.match("/ws/**", request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String query = request.getQueryString();
        if (query != null && MONGO_OPERATOR.matcher(query).find()) {
            log.warn("MongoDB injection attempt in query string from IP={} path={}",
                    request.getRemoteAddr(), request.getRequestURI());
            rejectRequest(response);
            return;
        }

        String contentType = request.getContentType();
        if (contentType != null && contentType.contains("application/json")) {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            request.getInputStream().transferTo(baos);
            String body = baos.toString(StandardCharsets.UTF_8);

            if (!body.isEmpty() && MONGO_OPERATOR.matcher(body).find()) {
                log.warn("MongoDB injection attempt in body from IP={} path={}",
                        request.getRemoteAddr(), request.getRequestURI());
                rejectRequest(response);
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private void rejectRequest(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.BAD_REQUEST.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> body = Map.of(
                "code",      "INVALID_INPUT",
                "message",   "Request contains disallowed characters or patterns.",
                "timestamp", Instant.now().toString()
        );
        objectMapper.writeValue(response.getWriter(), body);
    }
}
