package com.dppsmart.dppsmart.Security.Session;

import jakarta.servlet.http.HttpServletRequest;

public final class DeviceParser {

    private DeviceParser() {}

    public static String extractBrowser(String ua) {
        if (ua == null) return "Unknown";
        if (ua.contains("Edg/") || ua.contains("Edge/")) return "Microsoft Edge";
        if (ua.contains("OPR/") || ua.contains("Opera/")) return "Opera";
        if (ua.contains("Chrome/") && !ua.contains("Chromium/")) return "Google Chrome";
        if (ua.contains("Chromium/")) return "Chromium";
        if (ua.contains("Firefox/")) return "Mozilla Firefox";
        if (ua.contains("Safari/") && !ua.contains("Chrome/")) return "Apple Safari";
        if (ua.contains("MSIE") || ua.contains("Trident/")) return "Internet Explorer";
        if (ua.contains("curl/")) return "cURL";
        if (ua.contains("PostmanRuntime")) return "Postman";
        return "Unknown Browser";
    }

    public static String extractOs(String ua) {
        if (ua == null) return "Unknown";
        if (ua.contains("Windows NT 10.0")) return "Windows 10/11";
        if (ua.contains("Windows NT 6.3")) return "Windows 8.1";
        if (ua.contains("Windows NT 6.2")) return "Windows 8";
        if (ua.contains("Windows NT 6.1")) return "Windows 7";
        if (ua.contains("Windows")) return "Windows";
        if (ua.contains("iPhone")) return "iOS (iPhone)";
        if (ua.contains("iPad")) return "iOS (iPad)";
        if (ua.contains("Mac OS X")) return "macOS";
        if (ua.contains("Android")) return "Android";
        if (ua.contains("Linux")) return "Linux";
        if (ua.contains("CrOS")) return "ChromeOS";
        return "Unknown OS";
    }

    public static String extractDeviceName(String ua) {
        if (ua == null) return "Unknown Device";
        String os = extractOs(ua);
        String browser = extractBrowser(ua);
        return browser + " on " + os;
    }

    public static String extractIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp.trim();
        return request.getRemoteAddr();
    }
}
