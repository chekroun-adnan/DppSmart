package com.dppsmart.dppsmart.Orders.Mapper;

import com.dppsmart.dppsmart.Orders.DTO.OrderResponseDto;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.Services.OrderPriorityService;

public class OrdersMapper {

    private static final OrderPriorityService priorityService = new OrderPriorityService();

    public static OrderResponseDto toDto(Orders order) {
        OrderResponseDto dto = new OrderResponseDto();
        dto.setId(order.getId());
        dto.setOrderReference(order.getOrderReference());
        dto.setClientId(order.getClientId());
        dto.setOrganizationId(order.getOrganizationId());
        dto.setItems(order.getItems());
        dto.setMaterialSource(order.getMaterialSource());
        dto.setRequestedDeliveryDate(order.getRequestedDeliveryDate());
        dto.setConfirmedDeliveryDate(order.getConfirmedDeliveryDate());
        dto.setProposedDeliveryDate(order.getProposedDeliveryDate());
        dto.setAdminMessage(order.getAdminMessage());
        dto.setClientResponseMessage(order.getClientResponseMessage());
        dto.setStatus(order.getStatus());
        dto.setTotalQuantity(order.getTotalQuantity());
        dto.setOverallMaterialsSufficient(order.isOverallMaterialsSufficient());
        dto.setRelatedProductionId(order.getRelatedProductionId());
        dto.setDeliveryToken(order.getDeliveryToken());
        dto.setOrderPriority(order.getOrderPriority());
        dto.setPriority(order.getPriority());
        dto.setAllocationSessionId(order.getAllocationSessionId());
        dto.setRelatedProductionIds(order.getRelatedProductionIds());
        dto.setSupplyChainOrderId(order.getSupplyChainOrderId());
        dto.setStockCheckedAt(order.getStockCheckedAt());
        dto.setProductionStartedAt(order.getProductionStartedAt());
        dto.setProductionCompletedAt(order.getProductionCompletedAt());
        dto.setDeliveryReadyAt(order.getDeliveryReadyAt());
        dto.setConfirmedBy(order.getConfirmedBy());
        dto.setDeliveredBy(order.getDeliveredBy());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setUpdatedAt(order.getUpdatedAt());
        dto.setCreatedBy(order.getCreatedBy());
        dto.setUpdatedBy(order.getUpdatedBy());
        dto.setProductionPriorityBadge(
                priorityService.computeProductionBadgeForDto(
                        order.getRequestedDeliveryDate(),
                        order.getConfirmedDeliveryDate(),
                        order.getProposedDeliveryDate()));
        dto.setPriorityScore(
                priorityService.computePriorityScoreForDto(
                        order.getRequestedDeliveryDate(),
                        order.getConfirmedDeliveryDate(),
                        order.getProposedDeliveryDate(),
                        order.getOrderPriority(),
                        order.getCreatedAt()));

        // Billing
        dto.setQuoteId(order.getQuoteId());
        dto.setInvoiceId(order.getInvoiceId());
        dto.setBillingStatus(order.getBillingStatus());
        dto.setSubtotal(order.getSubtotal());
        dto.setTaxAmount(order.getTaxAmount());
        dto.setDiscountAmount(order.getDiscountAmount());
        dto.setTotalPrice(order.getTotalPrice());
        dto.setCurrency(order.getCurrency());

        dto.setTotalMaterialCost(order.getTotalMaterialCost());
        dto.setTotalProductionCost(order.getTotalProductionCost());
        dto.setMaterialCost(order.getMaterialCost());
        dto.setProductionCost(order.getProductionCost());
        dto.setTotalCost(order.getTotalCost());
        dto.setProfit(order.getProfit());
        dto.setMarginPercent(order.getMarginPercent());
        dto.setManufacturingMode(order.getManufacturingMode() != null
                ? order.getManufacturingMode().name() : null);

        // Payment
        dto.setPaymentStatus(order.getPaymentStatus());
        dto.setAmountDue(order.getAmountDue());
        dto.setAmountPaid(order.getAmountPaid());
        dto.setDepositPercent(order.getDepositPercent());

        return dto;
    }
}
