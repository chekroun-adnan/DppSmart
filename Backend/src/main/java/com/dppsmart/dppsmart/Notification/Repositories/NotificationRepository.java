package com.dppsmart.dppsmart.Notification.Repositories;

import com.dppsmart.dppsmart.Notification.Entities.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId);
    long countByUserIdAndReadFalse(String userId);
    Optional<Notification> findByDeduplicationKeyAndReadFalse(String deduplicationKey);
    List<Notification> findByDeduplicationKey(String deduplicationKey);
}