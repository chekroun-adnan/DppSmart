package com.dppsmart.dppsmart.User.Repositories;

import com.dppsmart.dppsmart.User.Entities.Token;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface TokenRepository extends MongoRepository<Token, String> {

    Optional<Token> findByToken(String token);

    List<Token> findByUserIdAndRevokedFalseAndExpiredFalse(String userId);
}
