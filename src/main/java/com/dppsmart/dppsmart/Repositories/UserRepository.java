package com.dppsmart.dppsmart.Repositories;

import com.dppsmart.dppsmart.Entities.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    void deleteByEmail(String email);
}
