package com.dppsmart.dppsmart.Organization.Repositories;

import com.dppsmart.dppsmart.Organization.Entities.Organization;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface OrganizationRepository extends MongoRepository<Organization, String> {
}
