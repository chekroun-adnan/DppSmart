package com.dppsmart.dppsmart.Security.RateLimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class RateLimiterService {

    private final RateLimitConfig config;

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public enum BucketType { AUTH, PUBLIC, AI }

    public void consume(BucketType type, String ip) {
        Bucket bucket = buckets.computeIfAbsent(type + ":" + ip, k -> newBucket(type));
        var probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfter = probe.getNanosToWaitForRefill() / 1_000_000_000L + 1;
            throw new RateLimitException(retryAfter);
        }
    }

    public long remaining(BucketType type, String ip) {
        Bucket bucket = buckets.get(type + ":" + ip);
        return bucket == null ? capacity(type) : bucket.getAvailableTokens();
    }


    private Bucket newBucket(BucketType type) {
        return Bucket.builder()
                .addLimit(bandwidth(type))
                .build();
    }

    private Bandwidth bandwidth(BucketType type) {
        return switch (type) {
            case AUTH   -> Bandwidth.builder()
                    .capacity(config.getAuthRequests())
                    .refillIntervally(config.getAuthRequests(),
                            Duration.ofSeconds(config.getAuthWindowSeconds()))
                    .build();
            case PUBLIC -> Bandwidth.builder()
                    .capacity(config.getPublicRequests())
                    .refillIntervally(config.getPublicRequests(),
                            Duration.ofSeconds(config.getPublicWindowSeconds()))
                    .build();
            case AI     -> Bandwidth.builder()
                    .capacity(config.getAiRequests())
                    .refillIntervally(config.getAiRequests(),
                            Duration.ofSeconds(config.getAiWindowSeconds()))
                    .build();
        };
    }

    private long capacity(BucketType type) {
        return switch (type) {
            case AUTH   -> config.getAuthRequests();
            case PUBLIC -> config.getPublicRequests();
            case AI     -> config.getAiRequests();
        };
    }
}
