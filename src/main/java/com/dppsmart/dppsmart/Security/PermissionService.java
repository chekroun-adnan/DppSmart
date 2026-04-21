package com.dppsmart.dppsmart.Security;

import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Entities.Roles;
import org.springframework.stereotype.Service;

@Service
public class PermissionService {

    public boolean isAdmin(User user) {
        return user.getRole() == Roles.ADMIN;
    }

    public boolean isSubAdmin(User user) {
        return user.getRole() == Roles.SUBADMIN;    }

    public boolean canAccessOrganization(User user, String orgId) {
        return user.getOrganizationId().equals(orgId);
    }
}
