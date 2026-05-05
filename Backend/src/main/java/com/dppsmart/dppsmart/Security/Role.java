package com.dppsmart.dppsmart.Security;

import com.dppsmart.dppsmart.User.Entities.Roles;

public enum Role {
    ADMIN,
    SUB_ADMIN,
    EMPLOYEE,
    CLIENT;

    public static Role from(Roles r) {
        if (r == null) return CLIENT;
        return switch (r) {
            case ADMIN -> ADMIN;
            case SUBADMIN -> SUB_ADMIN;
            case EMPLOYEE -> EMPLOYEE;
            case CLIENT -> CLIENT;
        };
    }
}

