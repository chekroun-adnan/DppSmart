package com.dppsmart.dppsmart.Security.Sanitization;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.io.*;
import java.nio.charset.StandardCharsets;


public class XssRequestWrapper extends HttpServletRequestWrapper {

    private final byte[] sanitizedBody;

    public XssRequestWrapper(HttpServletRequest request) throws IOException {
        super(request);
        String contentType = request.getContentType();
        if (contentType != null && !contentType.contains("application/json")) {
            String body = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            String sanitized = XssSanitizer.sanitize(body);
            sanitizedBody = sanitized.getBytes(StandardCharsets.UTF_8);
        } else {
            sanitizedBody = request.getInputStream().readAllBytes();
        }
    }

    @Override
    public ServletInputStream getInputStream() {
        ByteArrayInputStream bais = new ByteArrayInputStream(sanitizedBody);
        return new ServletInputStream() {
            @Override public boolean isFinished()  { return bais.available() == 0; }
            @Override public boolean isReady()      { return true; }
            @Override public void setReadListener(ReadListener l) {}
            @Override public int read()             { return bais.read(); }
        };
    }

    @Override
    public BufferedReader getReader() {
        return new BufferedReader(
                new InputStreamReader(new ByteArrayInputStream(sanitizedBody), StandardCharsets.UTF_8));
    }

    @Override
    public String getParameter(String name) {
        return XssSanitizer.sanitize(super.getParameter(name));
    }

    @Override
    public String[] getParameterValues(String name) {
        String[] values = super.getParameterValues(name);
        if (values == null) return null;
        String[] sanitized = new String[values.length];
        for (int i = 0; i < values.length; i++) {
            sanitized[i] = XssSanitizer.sanitize(values[i]);
        }
        return sanitized;
    }

    @Override
    public String getHeader(String name) {
        if ("Authorization".equalsIgnoreCase(name) || "Content-Type".equalsIgnoreCase(name)) {
            return super.getHeader(name);
        }
        return XssSanitizer.sanitize(super.getHeader(name));
    }
}
