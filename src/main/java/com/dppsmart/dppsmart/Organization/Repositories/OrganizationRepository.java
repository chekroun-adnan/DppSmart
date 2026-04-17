package com.dppsmart.dppsmart.Organization.Repositories;

import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Entities.OrganizationType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Arrays;
import java.util.List;

public interface OrganizationRepository extends MongoRepository<Organization, String> {
    List<Organization> findByOrganizationType(OrganizationType organizationType);

    List <Organization> findByParentOrganizationId(String parentId);

    Organization findByName(String name);
}
