package com.dppsmart.dppsmart.Security;

import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Entities.Roles;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Service
public class PermissionService {

    public boolean isAdmin(User user) {
        return user.getRole() == Roles.ADMIN;
    }

    public boolean isSubAdmin(User user) {
        return user.getRole() == Roles.SUBADMIN;
    }

    public boolean isEmployee(User user) {
        return user != null && user.getRole() == Roles.EMPLOYEE;
    }

    public boolean isClient(User user) {
        return user != null && user.getRole() == Roles.CLIENT;
    }

    public boolean hasPermission(User user, Permission permission) {
        if (user == null || permission == null) return false;
        if (user.getRole() == null) return false;
        if (isAdmin(user)) return true;

        return switch (user.getRole()) {
            case ADMIN -> true;
            case SUBADMIN -> switch (permission) {
                case ORGANIZATIONS_MANAGE -> true;
                case EMPLOYEES_MANAGE, PRODUCTS_MANAGE, STOCK_MANAGE, ORDERS_MANAGE, PRODUCTIONS_MANAGE, SCANS_READ -> true;
                case PRODUCTS_READ, PRODUCTIONS_READ, STOCK_READ -> true;
                case AI_INSIGHTS_ORG, AI_ASSISTANT_BASIC -> true;
                default -> false;
            };
            case EMPLOYEE -> switch (permission) {
                case SCANS_CREATE -> true;
                case PRODUCTS_READ -> true;
                case AI_ASSISTANT_BASIC -> true;
                default -> false;
            };
            case CLIENT -> switch (permission) {
                case PRODUCTS_READ -> true;
                case ORDERS_CREATE, ORDERS_READ_OWN -> true;
                case AI_ASSISTANT_BASIC -> true;
                default -> false;
            };
            default -> false;
        };
    }

    public boolean canAccessOrganization(User user, String orgId) {
        if (user == null || orgId == null) return false;
        if (isAdmin(user)) return true;

        Set<String> allowed = new HashSet<>();
        if (user.getOrganizationId() != null) allowed.add(user.getOrganizationId());
        if (user.getAssignedOrganizationIds() != null) allowed.addAll(user.getAssignedOrganizationIds());

        return allowed.stream().filter(Objects::nonNull).anyMatch(orgId::equals);
    }
}
