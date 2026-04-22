package com.dppsmart.dppsmart.Orders.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Orders.DTO.CreateOrderDto;
import com.dppsmart.dppsmart.Orders.DTO.OrderResponseDto;
import com.dppsmart.dppsmart.Orders.DTO.UpdateOrderDto;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.Mapper.OrdersMapper;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrdersService {
    private final OrdersRepository ordersRepository;
    private final OrganizationRepository organizationRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public OrderResponseDto create(CreateOrderDto dto) {
        User user = getCurrentUser();

        if (!organizationRepository.existsById(dto.getOrganizationId())) {
            throw new NotFoundException("Organization not found");
        }
        if (!productRepository.existsById(dto.getProductId())) {
            throw new NotFoundException("Product not found");
        }
        if (user.getRole() != Roles.CLIENT && !permissionService.canAccessOrganization(user, dto.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
        }

        Orders order = new Orders();
        order.setId(NanoIdUtils.randomNanoId());
        order.setOrderReference(generateOrderReference());
        order.setProductId(dto.getProductId());
        order.setOrganizationId(dto.getOrganizationId());
        order.setQuantity(dto.getQuantity());
        order.setStatus(dto.getStatus());
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        order.setCreatedBy(user.getEmail());
        order.setUpdatedBy(user.getEmail());

        return OrdersMapper.toDto(ordersRepository.save(order));
    }

    public OrderResponseDto update(UpdateOrderDto dto) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to update orders");
        }

        Orders order = ordersRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this order");
        }

        if (dto.getOrganizationId() != null && !dto.getOrganizationId().isBlank()) {
            if (!organizationRepository.existsById(dto.getOrganizationId())) {
                throw new NotFoundException("Organization not found");
            }
            if (!permissionService.canAccessOrganization(user, dto.getOrganizationId())) {
                throw new ForbiddenException("You are not allowed to move order to another organization");
            }
            order.setOrganizationId(dto.getOrganizationId());
        }

        if (dto.getProductId() != null && !dto.getProductId().isBlank()) {
            if (!productRepository.existsById(dto.getProductId())) {
                throw new NotFoundException("Product not found");
            }
            order.setProductId(dto.getProductId());
        }

        if (dto.getQuantity() != null) order.setQuantity(dto.getQuantity());
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) order.setStatus(dto.getStatus());

        order.setUpdatedAt(LocalDateTime.now());
        order.setUpdatedBy(user.getEmail());

        return OrdersMapper.toDto(ordersRepository.save(order));
    }

    public OrderResponseDto getById(String id) {
        User user = getCurrentUser();
        Orders order = ordersRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (user.getRole() == Roles.CLIENT) {
            if (user.getEmail() == null || !user.getEmail().equals(order.getCreatedBy())) {
                throw new ForbiddenException("You are not allowed to access this order");
            }
        } else {
            if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
                throw new ForbiddenException("You are not allowed to access this order");
            }
        }
        return OrdersMapper.toDto(order);
    }

    public List<OrderResponseDto> getAll() {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT) {
            return ordersRepository.findAll().stream()
                    .filter(o -> user.getEmail() != null && user.getEmail().equals(o.getCreatedBy()))
                    .map(OrdersMapper::toDto)
                    .toList();
        }
        return ordersRepository.findAll().stream()
                .filter(o -> permissionService.canAccessOrganization(user, o.getOrganizationId()))
                .map(OrdersMapper::toDto)
                .toList();
    }

    public List<OrderResponseDto> getByOrganization(String organizationId) {
        User user = getCurrentUser();
        if (!permissionService.canAccessOrganization(user, organizationId)) {
            throw new ForbiddenException("You are not allowed to access this organization");
        }
        return ordersRepository.findByOrganizationId(organizationId)
                .stream()
                .map(OrdersMapper::toDto)
                .toList();
    }

    public void delete(String id) {
        User user = getCurrentUser();
        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to delete orders");
        }

        Orders order = ordersRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to delete this order");
        }

        ordersRepository.deleteById(id);
    }

    private String generateOrderReference() {
        for (int i = 0; i < 5; i++) {
            String ref = "ORD-" + NanoIdUtils.randomNanoId().toUpperCase();
            if (!ordersRepository.existsByOrderReference(ref)) return ref;
        }
        throw new BadRequestException("Could not generate unique order reference");
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}

