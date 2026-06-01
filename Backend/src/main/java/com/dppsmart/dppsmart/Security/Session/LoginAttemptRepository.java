package com.dppsmart.dppsmart.Security.Session;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface LoginAttemptRepository extends MongoRepository<LoginAttempt, String> {

    long countByEmailAndSuccessFalseAndAttemptTimeAfter(
            String email, LocalDateTime since);

    long countByIpAddressAndSuccessFalseAndAttemptTimeAfter(
            String ipAddress, LocalDateTime since);

    List<LoginAttempt> findByEmailOrderByAttemptTimeDesc(String email);

    List<LoginAttempt> findByIpAddressOrderByAttemptTimeDesc(String ipAddress);

    List<LoginAttempt> findByEmailAndAttemptTimeAfter(String email, LocalDateTime since);
}
