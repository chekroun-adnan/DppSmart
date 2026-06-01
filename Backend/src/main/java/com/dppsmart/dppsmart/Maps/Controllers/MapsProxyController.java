package com.dppsmart.dppsmart.Maps.Controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/maps")
public class MapsProxyController {

    @Value("${google.maps.server.key:}")
    private String serverKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/roads/snap")
    public ResponseEntity<String> snapToRoads(@RequestParam String path) {
        if (serverKey == null || serverKey.isBlank()) {
            return ResponseEntity.ok("{\"snappedPoints\":[]}");
        }
        String url = UriComponentsBuilder
                .fromUriString("https://roads.googleapis.com/v1/snapToRoads")
                .queryParam("path", path)
                .queryParam("interpolate", true)
                .queryParam("key", serverKey)
                .build(false)
                .toUriString();
        try {
            String result = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok("{\"snappedPoints\":[],\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
