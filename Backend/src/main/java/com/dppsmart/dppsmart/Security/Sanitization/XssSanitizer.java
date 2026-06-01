package com.dppsmart.dppsmart.Security.Sanitization;

import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;

public final class XssSanitizer {

    private static final PolicyFactory NO_HTML = new HtmlPolicyBuilder().toFactory();

    private XssSanitizer() {}

    public static String sanitize(String input) {
        if (input == null) return null;
        return NO_HTML.sanitize(input);
    }

    public static boolean containsSuspiciousPatterns(String input) {
        if (input == null) return false;
        String lower = input.toLowerCase();
        return lower.contains("<script")
                || lower.contains("javascript:")
                || lower.contains("vbscript:")
                || lower.contains("onload=")
                || lower.contains("onerror=")
                || lower.contains("eval(")
                || lower.contains("expression(");
    }
}
