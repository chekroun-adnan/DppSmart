package com.dppsmart.dppsmart.Landing.Repositories;

import com.dppsmart.dppsmart.Landing.Entities.ContactLead;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ContactLeadRepository extends MongoRepository<ContactLead, String> {
}

