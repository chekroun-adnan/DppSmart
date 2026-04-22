package com.dppsmart.dppsmart.Security;

/**
 * High-level permissions used by RBAC checks.
 * Use with {@link PermissionService} helpers and method-level security.
 */
public enum Permission {
    USERS_MANAGE,
    ORGANIZATIONS_MANAGE,
    EMPLOYEES_MANAGE,
    EMPLOYEES_READ_OWN,
    PRODUCTS_MANAGE,
    PRODUCTS_READ,
    STOCK_MANAGE,
    STOCK_READ,
    ORDERS_MANAGE,
    ORDERS_CREATE,
    ORDERS_READ_OWN,
    PRODUCTIONS_MANAGE,
    PRODUCTIONS_READ,
    SCANS_CREATE,
    SCANS_READ,
    AI_INSIGHTS_GLOBAL,
    AI_INSIGHTS_ORG,
    AI_ASSISTANT_BASIC
}

