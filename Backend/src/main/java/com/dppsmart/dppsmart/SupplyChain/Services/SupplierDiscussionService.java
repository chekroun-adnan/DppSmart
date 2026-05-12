package com.dppsmart.dppsmart.SupplyChain.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.SupplyChain.DTO.*;
import com.dppsmart.dppsmart.SupplyChain.Entities.MaterialOrder;
import com.dppsmart.dppsmart.SupplyChain.Entities.SupplierDiscussion;
import com.dppsmart.dppsmart.SupplyChain.Repositories.MaterialOrderRepository;
import com.dppsmart.dppsmart.SupplyChain.Repositories.SupplierDiscussionRepository;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class SupplierDiscussionService {

    private final SupplierDiscussionRepository discussionRepository;
    private final MaterialOrderRepository orderRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public DiscussionResponseDTO getOrCreateDiscussion(String orderId) {
        User user = getCurrentUser();
        MaterialOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Purchase order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Not allowed");
        }

        SupplierDiscussion discussion = discussionRepository.findByMaterialOrderId(orderId)
                .orElseGet(() -> {
                    SupplierDiscussion d = new SupplierDiscussion();
                    d.setId(NanoIdUtils.randomNanoId());
                    d.setMaterialOrderId(orderId);
                    d.setOrganizationId(order.getOrganizationId());
                    d.setMessages(new ArrayList<>());
                    d.setCreatedAt(LocalDateTime.now());
                    d.setUpdatedAt(LocalDateTime.now());
                    return discussionRepository.save(d);
                });

        return toDTO(discussion);
    }

    public DiscussionResponseDTO sendMessage(String orderId, SendMessageDTO dto) {
        User user = getCurrentUser();
        MaterialOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Purchase order not found"));

        if (!permissionService.canAccessOrganization(user, order.getOrganizationId())) {
            throw new ForbiddenException("Not allowed");
        }

        SupplierDiscussion discussion = discussionRepository.findByMaterialOrderId(orderId)
                .orElseGet(() -> {
                    SupplierDiscussion d = new SupplierDiscussion();
                    d.setId(NanoIdUtils.randomNanoId());
                    d.setMaterialOrderId(orderId);
                    d.setOrganizationId(order.getOrganizationId());
                    d.setMessages(new ArrayList<>());
                    d.setCreatedAt(LocalDateTime.now());
                    d.setUpdatedAt(LocalDateTime.now());
                    return discussionRepository.save(d);
                });

        SupplierDiscussion.DiscussionMessage msg = new SupplierDiscussion.DiscussionMessage();
        msg.setId(NanoIdUtils.randomNanoId());
        msg.setSender(user.getEmail());
        msg.setSenderRole(user.getRole() != null ? user.getRole().name() : "EMPLOYEE");
        msg.setSenderName(user.getName());
        msg.setMessage(dto.getMessage());
        msg.setTimestamp(LocalDateTime.now());

        if (discussion.getMessages() == null) discussion.setMessages(new ArrayList<>());
        discussion.getMessages().add(msg);
        discussion.setUpdatedAt(LocalDateTime.now());
        discussionRepository.save(discussion);

        return toDTO(discussion);
    }

    private DiscussionResponseDTO toDTO(SupplierDiscussion d) {
        DiscussionResponseDTO dto = new DiscussionResponseDTO();
        dto.setId(d.getId());
        dto.setMaterialOrderId(d.getMaterialOrderId());
        dto.setOrganizationId(d.getOrganizationId());
        dto.setCreatedAt(d.getCreatedAt());
        dto.setUpdatedAt(d.getUpdatedAt());
        if (d.getMessages() != null) {
            dto.setMessages(d.getMessages().stream().map(m -> {
                DiscussionResponseDTO.DiscussionMessageDTO msgDto = new DiscussionResponseDTO.DiscussionMessageDTO();
                msgDto.setId(m.getId());
                msgDto.setSender(m.getSender());
                msgDto.setSenderRole(m.getSenderRole());
                msgDto.setSenderName(m.getSenderName());
                msgDto.setMessage(m.getMessage());
                msgDto.setTimestamp(m.getTimestamp());
                return msgDto;
            }).toList());
        }
        return dto;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}