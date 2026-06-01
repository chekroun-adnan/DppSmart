package com.dppsmart.dppsmart.Security.Session;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends MongoRepository<UserSession, String> {

    List<UserSession> findByUserIdOrderByLoginTimeDesc(String userId);

    List<UserSession> findByUserIdAndSessionStatus(String userId, String status);

    Optional<UserSession> findByTokenId(String tokenId);

    Optional<UserSession> findByAccessToken(String accessToken);

    long countByUserIdAndSessionStatusAndLoginTimeAfter(
            String userId, String status, LocalDateTime since);

    List<UserSession> findByUserIdAndSuspiciousTrue(String userId);
}
