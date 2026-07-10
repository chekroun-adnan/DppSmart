package com.dppsmart.dppsmart.Expedition.Services;

import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.Expedition.DTO.*;
import com.dppsmart.dppsmart.Expedition.Entities.*;
import com.dppsmart.dppsmart.Expedition.Repositories.ExpeditionRepository;
import com.dppsmart.dppsmart.Expedition.Repositories.PackageBoxRepository;
import com.dppsmart.dppsmart.Orders.Entities.ClientOrderStatus;
import com.dppsmart.dppsmart.Orders.Entities.Orders;
import com.dppsmart.dppsmart.Orders.repositories.OrdersRepository;
import com.dppsmart.dppsmart.Product.Entities.Product;
import com.dppsmart.dppsmart.Product.Repositories.ProductRepository;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepEntity;
import com.dppsmart.dppsmart.Production.Entities.ProductionStepStatus;
import com.dppsmart.dppsmart.Production.Repositories.ProductionStepEntityRepository;
import com.dppsmart.dppsmart.User.Entities.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpeditionService {

    private final ExpeditionRepository expeditionRepository;
    private final PackageBoxRepository packageBoxRepository;
    private final OrdersRepository ordersRepository;
    private final ProductRepository productRepository;
    private final ProductionStepEntityRepository stepRepository;


    @Transactional
    public ExpeditionResponseDto createExpedition(String orderId, User user) {
        Optional<Expedition> existing = expeditionRepository.findByOrderId(orderId);
        if (existing.isPresent()) {
            return toDto(existing.get());
        }

        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found"));

        if (order.getTotalQuantity() == null || order.getTotalQuantity() == 0) {
            throw new BadRequestException("Order has no quantity to pack");
        }

        Integer unitsPerBox = findUnitsPerBox(order);
        int totalQty = order.getTotalQuantity();
        int requiredBoxes = calculateRequiredBoxes(totalQty, unitsPerBox);

        Expedition expedition = Expedition.builder()
                .orderId(orderId)
                .organizationId(order.getOrganizationId())
                .status(ExpeditionStatus.PREPARING)
                .totalQuantity(totalQty)
                .packedQuantity(0)
                .remainingQuantity(totalQty)
                .requiredBoxes(requiredBoxes)
                .filledBoxes(0)
                .partialBoxes(0)
                .unitsPerBox(unitsPerBox)
                .createdBy(user.getEmail())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Expedition saved = expeditionRepository.save(expedition);

        List<PackageBox> boxes = generateBoxes(saved.getId(), totalQty, unitsPerBox);
        packageBoxRepository.saveAll(boxes);

        saved.setStatus(ExpeditionStatus.PACKING);
        expeditionRepository.save(saved);

        return toDto(saved);
    }


    public int calculateRequiredBoxes(int totalQuantity, int unitsPerBox) {
        if (unitsPerBox <= 0) return totalQuantity;
        return (int) Math.ceil((double) totalQuantity / unitsPerBox);
    }

    private List<PackageBox> generateBoxes(String expeditionId, int totalQuantity, int unitsPerBox) {
        int required = calculateRequiredBoxes(totalQuantity, unitsPerBox);
        List<PackageBox> boxes = new ArrayList<>();

        int remaining = totalQuantity;
        for (int i = 1; i <= required; i++) {
            int boxCapacity = unitsPerBox;
            int boxQuantity = Math.min(boxCapacity, remaining);
            BoxStatus boxStatus = boxQuantity == 0 ? BoxStatus.EMPTY :
                    boxQuantity >= boxCapacity ? BoxStatus.FULL : BoxStatus.PARTIALLY_FILLED;

            PackageBox box = PackageBox.builder()
                    .expeditionId(expeditionId)
                    .boxNumber(i)
                    .capacity(boxCapacity)
                    .currentQuantity(boxQuantity)
                    .remainingCapacity(boxCapacity - boxQuantity)
                    .status(boxStatus)
                    .barcode(generateBarcode(expeditionId, i))
                    .createdAt(LocalDateTime.now())
                    .build();

            boxes.add(box);
            remaining -= boxQuantity;
        }

        return boxes;
    }

    private String generateBarcode(String expeditionId, int boxNumber) {
        return "BOX-" + expeditionId.substring(0, Math.min(8, expeditionId.length())) + "-" + String.format("%04d", boxNumber);
    }


    @Transactional
    public ExpeditionResponseDto packBox(String expeditionId, String boxId, int quantity, User user) {
        Expedition expedition = expeditionRepository.findById(expeditionId)
                .orElseThrow(() -> new NotFoundException("Expedition not found"));

        if (expedition.getStatus() == ExpeditionStatus.READY_TO_SHIP ||
                expedition.getStatus() == ExpeditionStatus.SHIPPED ||
                expedition.getStatus() == ExpeditionStatus.DELIVERED) {
            throw new BadRequestException("Cannot pack boxes in " + expedition.getStatus() + " status");
        }

        int maxPackable = getMaxPackableQuantity(expedition);
        if (quantity > maxPackable) {
            throw new BadRequestException(
                    "Cannot pack " + quantity + " units. Only " + maxPackable + " units have been produced so far."
            );
        }

        PackageBox box = packageBoxRepository.findById(boxId)
                .orElseThrow(() -> new NotFoundException("Package box not found"));

        if (!box.getExpeditionId().equals(expeditionId)) {
            throw new BadRequestException("Box does not belong to this expedition");
        }

        if (box.getStatus() == BoxStatus.FULL || box.getStatus() == BoxStatus.SEALED || box.getStatus() == BoxStatus.SHIPPED) {
            throw new BadRequestException("Box " + box.getBoxNumber() + " is already " + box.getStatus());
        }

        int availableCapacity = box.getRemainingCapacity();
        if (quantity > availableCapacity) {
            throw new BadRequestException(
                    "Box " + box.getBoxNumber() + " only has " + availableCapacity + " remaining capacity"
            );
        }

        int newQuantity = box.getCurrentQuantity() + quantity;
        box.setCurrentQuantity(newQuantity);
        box.setRemainingCapacity(box.getCapacity() - newQuantity);
        box.setStatus(newQuantity >= box.getCapacity() ? BoxStatus.FULL : BoxStatus.PARTIALLY_FILLED);
        box.setUpdatedAt(LocalDateTime.now());
        packageBoxRepository.save(box);

        updateExpeditionTotals(expedition);

        return toDto(expedition);
    }

    @Transactional
    public ExpeditionResponseDto packIntoNextBox(String expeditionId, int quantity, User user) {
        Expedition expedition = expeditionRepository.findById(expeditionId)
                .orElseThrow(() -> new NotFoundException("Expedition not found"));

        List<PackageBox> boxes = packageBoxRepository.findByExpeditionIdOrderByBoxNumberAsc(expeditionId);

        int remainingToPack = quantity;
        for (PackageBox box : boxes) {
            if (remainingToPack <= 0) break;
            if (box.getStatus() == BoxStatus.FULL || box.getStatus() == BoxStatus.SEALED || box.getStatus() == BoxStatus.SHIPPED) {
                continue;
            }

            int canPack = Math.min(remainingToPack, box.getRemainingCapacity());
            if (canPack > 0) {
                int maxPackable = getMaxPackableQuantity(expedition);
                int alreadyPacked = expedition.getPackedQuantity();
                if (alreadyPacked + canPack > maxPackable) {
                    int adjusted = maxPackable - alreadyPacked;
                    if (adjusted <= 0) break;
                    canPack = adjusted;
                }

                box.setCurrentQuantity(box.getCurrentQuantity() + canPack);
                box.setRemainingCapacity(box.getCapacity() - box.getCurrentQuantity());
                box.setStatus(box.getCurrentQuantity() >= box.getCapacity() ? BoxStatus.FULL : BoxStatus.PARTIALLY_FILLED);
                box.setUpdatedAt(LocalDateTime.now());
                packageBoxRepository.save(box);
                remainingToPack -= canPack;
            }
        }

        updateExpeditionTotals(expedition);

        Expedition updated = expeditionRepository.findById(expeditionId).orElse(expedition);
        return toDto(updated);
    }

    @Transactional
    public ExpeditionResponseDto updateUnitsPerBox(String expeditionId, int newUnitsPerBox, User user) {
        if (newUnitsPerBox <= 0) {
            throw new BadRequestException("Units per box must be greater than 0");
        }

        Expedition expedition = expeditionRepository.findById(expeditionId)
                .orElseThrow(() -> new NotFoundException("Expedition not found"));

        if (expedition.getStatus() == ExpeditionStatus.READY_TO_SHIP ||
                expedition.getStatus() == ExpeditionStatus.SHIPPED ||
                expedition.getStatus() == ExpeditionStatus.DELIVERED) {
            throw new BadRequestException("Cannot change units per box after shipping");
        }

        if (expedition.getPackedQuantity() > 0) {
            throw new BadRequestException("Cannot change units per box after packing has started. Reset packing first.");
        }

        expedition.setUnitsPerBox(newUnitsPerBox);
        int requiredBoxes = calculateRequiredBoxes(expedition.getTotalQuantity(), newUnitsPerBox);
        expedition.setRequiredBoxes(requiredBoxes);
        expedition.setUpdatedAt(LocalDateTime.now());
        expeditionRepository.save(expedition);

        packageBoxRepository.deleteByExpeditionId(expeditionId);

        List<PackageBox> newBoxes = generateBoxes(expeditionId, expedition.getTotalQuantity(), newUnitsPerBox);
        packageBoxRepository.saveAll(newBoxes);

        return toDto(expedition);
    }

    @Transactional
    public ExpeditionResponseDto sealBox(String boxId, User user) {
        PackageBox box = packageBoxRepository.findById(boxId)
                .orElseThrow(() -> new NotFoundException("Package box not found"));

        if (box.getStatus() != BoxStatus.FULL && box.getStatus() != BoxStatus.PARTIALLY_FILLED) {
            throw new BadRequestException("Box must be FULL or PARTIALLY_FILLED to seal");
        }

        box.setStatus(BoxStatus.SEALED);
        box.setUpdatedAt(LocalDateTime.now());
        packageBoxRepository.save(box);

        Expedition expedition = expeditionRepository.findById(box.getExpeditionId())
                .orElseThrow(() -> new NotFoundException("Expedition not found"));
        return toDto(expedition);
    }


    @Transactional
    public ExpeditionResponseDto markReadyToShip(String expeditionId, User user) {
        Expedition expedition = expeditionRepository.findById(expeditionId)
                .orElseThrow(() -> new NotFoundException("Expedition not found"));

        if (expedition.getPackedQuantity() < expedition.getTotalQuantity()) {
            throw new BadRequestException(
                    "Cannot mark ready to ship. Packed " + expedition.getPackedQuantity()
                            + " of " + expedition.getTotalQuantity() + " units. All units must be packed."
            );
        }

        int maxPackable = getMaxPackableQuantity(expedition);
        if (expedition.getPackedQuantity() > maxPackable) {
            throw new BadRequestException(
                    "Cannot mark ready to ship. Packed quantity (" + expedition.getPackedQuantity()
                            + ") exceeds produced quantity (" + maxPackable + ")."
            );
        }

        List<PackageBox> boxes = packageBoxRepository.findByExpeditionIdOrderByBoxNumberAsc(expeditionId);
        boolean allSealed = boxes.stream().allMatch(b -> b.getStatus() == BoxStatus.SEALED || b.getStatus() == BoxStatus.SHIPPED);
        if (!allSealed) {
            throw new BadRequestException("All boxes must be sealed before marking ready to ship");
        }

        expedition.setStatus(ExpeditionStatus.READY_TO_SHIP);
        expedition.setUpdatedAt(LocalDateTime.now());
        expeditionRepository.save(expedition);

        return toDto(expedition);
    }

    @Transactional
    public ExpeditionResponseDto markShipped(String expeditionId, User user) {
        Expedition expedition = expeditionRepository.findById(expeditionId)
                .orElseThrow(() -> new NotFoundException("Expedition not found"));

        if (expedition.getStatus() != ExpeditionStatus.READY_TO_SHIP) {
            throw new BadRequestException("Expedition must be READY_TO_SHIP before shipping");
        }

        List<PackageBox> boxes = packageBoxRepository.findByExpeditionIdOrderByBoxNumberAsc(expeditionId);
        for (PackageBox box : boxes) {
            if (box.getStatus() == BoxStatus.SEALED) {
                box.setStatus(BoxStatus.SHIPPED);
                box.setUpdatedAt(LocalDateTime.now());
            }
        }
        packageBoxRepository.saveAll(boxes);

        expedition.setStatus(ExpeditionStatus.SHIPPED);
        expedition.setUpdatedAt(LocalDateTime.now());
        expeditionRepository.save(expedition);

        return toDto(expedition);
    }

    @Transactional
    public ExpeditionResponseDto markDelivered(String expeditionId, User user) {
        Expedition expedition = expeditionRepository.findById(expeditionId)
                .orElseThrow(() -> new NotFoundException("Expedition not found"));

        if (expedition.getStatus() != ExpeditionStatus.SHIPPED) {
            throw new BadRequestException("Expedition must be SHIPPED before delivery");
        }

        expedition.setStatus(ExpeditionStatus.DELIVERED);
        expedition.setCompletedAt(LocalDateTime.now());
        expedition.setUpdatedAt(LocalDateTime.now());
        expeditionRepository.save(expedition);

        return toDto(expedition);
    }


    public ExpeditionResponseDto getByOrderId(String orderId) {
        Expedition expedition = expeditionRepository.findByOrderId(orderId)
                .orElseThrow(() -> new NotFoundException("Expedition not found for order " + orderId));
        return toDto(expedition);
    }

    public ExpeditionResponseDto getOrCreateForOrder(String orderId, User user) {
        Optional<Expedition> existing = expeditionRepository.findByOrderId(orderId);
        if (existing.isPresent()) {
            return toDto(existing.get());
        }

        List<ProductionStepEntity> steps = stepRepository.findByOrderIdOrderBySequenceOrderAsc(orderId);
        if (steps.isEmpty()) {
            throw new BadRequestException("Order has no production steps");
        }

        int maxSeq = steps.stream()
                .filter(s -> s.getSequenceOrder() != null)
                .mapToInt(ProductionStepEntity::getSequenceOrder)
                .max().orElse(-1);

        if (maxSeq < 0) {
            throw new BadRequestException("Cannot determine last step — steps have no sequence order");
        }

        ProductionStepEntity lastStep = steps.stream()
                .filter(s -> s.getSequenceOrder() != null && s.getSequenceOrder() == maxSeq)
                .findFirst().orElse(null);

        if (lastStep == null) {
            throw new BadRequestException("Could not identify the last production step");
        }

        boolean lastStepActive = lastStep.getStatus() == ProductionStepStatus.IN_PROGRESS
                || lastStep.getStatus() == ProductionStepStatus.COMPLETED;

        if (!lastStepActive) {
            throw new BadRequestException(
                    "Last step '" + lastStep.getOperationName() + "' is "
                    + lastStep.getStatus() + ". Expedition is created when the last step starts."
            );
        }

        return createExpedition(orderId, user);
    }

    @Transactional
    public int syncExistingOrders(String organizationId, User user) {
        List<Orders> allOrders = organizationId != null
                ? ordersRepository.findByOrganizationId(organizationId)
                : ordersRepository.findAll();
        List<Orders> inProduction = allOrders.stream()
                .filter(o -> o.getStatus() == ClientOrderStatus.IN_PRODUCTION
                        || o.getStatus() == ClientOrderStatus.PRODUCTION_COMPLETED)
                .collect(Collectors.toList());

        int created = 0;
        for (Orders order : inProduction) {
            if (expeditionRepository.findByOrderId(order.getId()).isPresent()) continue;

            List<ProductionStepEntity> steps = stepRepository.findByOrderIdOrderBySequenceOrderAsc(order.getId());
            if (steps.isEmpty()) continue;

            int maxSeq = steps.stream()
                    .filter(s -> s.getSequenceOrder() != null)
                    .mapToInt(ProductionStepEntity::getSequenceOrder)
                    .max().orElse(-1);
            if (maxSeq < 0) continue;

            ProductionStepEntity lastStep = steps.stream()
                    .filter(s -> s.getSequenceOrder() != null && s.getSequenceOrder() == maxSeq)
                    .findFirst().orElse(null);
            if (lastStep == null) continue;

            if (lastStep.getStatus() == ProductionStepStatus.IN_PROGRESS
                    || lastStep.getStatus() == ProductionStepStatus.COMPLETED) {
                try {
                    createExpedition(order.getId(), user);
                    created++;
                } catch (Exception e) {
                    log.warn("Could not create expedition for order {}: {}", order.getId(), e.getMessage());
                }
            }
        }
        return created;
    }

    public ExpeditionResponseDto getById(String id) {
        Expedition expedition = expeditionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Expedition not found"));
        return toDto(expedition);
    }

    public List<ExpeditionResponseDto> getByOrganization(String organizationId) {
        List<Expedition> expeditions = organizationId != null
                ? expeditionRepository.findByOrganizationId(organizationId)
                : expeditionRepository.findAll();
        return expeditions.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<ExpeditionResponseDto> getByOrganizationAndStatus(String organizationId, ExpeditionStatus status) {
        List<Expedition> expeditions = organizationId != null
                ? expeditionRepository.findByOrganizationIdAndStatus(organizationId, status)
                : expeditionRepository.findByStatus(status);
        return expeditions.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }


    public ExpeditionDashboardDto getDashboard(String organizationId) {
        ExpeditionDashboardDto dto = new ExpeditionDashboardDto();

        if (organizationId != null) {
            dto.setOrdersPacking(expeditionRepository.countByOrganizationIdAndStatus(organizationId, ExpeditionStatus.PACKING));
            dto.setOrdersReadyToShip(expeditionRepository.countByOrganizationIdAndStatus(organizationId, ExpeditionStatus.READY_TO_SHIP));

            List<Expedition> orgExpeditions = expeditionRepository.findByOrganizationId(organizationId);
            List<String> expIds = orgExpeditions.stream().map(Expedition::getId).collect(Collectors.toList());

            dto.setBoxesCreated((int) packageBoxRepository.countByExpeditionIdIn(expIds));
            dto.setBoxesFilled((int) packageBoxRepository.countByExpeditionIdInAndStatus(expIds, BoxStatus.FULL));
            dto.setPartialBoxes((int) packageBoxRepository.countByExpeditionIdInAndStatus(expIds, BoxStatus.PARTIALLY_FILLED));
            dto.setBoxesShipped((int) packageBoxRepository.countByExpeditionIdInAndStatus(expIds, BoxStatus.SHIPPED));

            List<Expedition> delivered = orgExpeditions.stream()
                    .filter(e -> e.getStatus() == ExpeditionStatus.DELIVERED && e.getStartedAt() != null && e.getCompletedAt() != null)
                    .collect(Collectors.toList());

            if (!delivered.isEmpty()) {
                double avgHours = delivered.stream()
                        .mapToLong(e -> Duration.between(e.getStartedAt(), e.getCompletedAt()).toHours())
                        .average()
                        .orElse(0);
                dto.setAveragePackingTimeHours(Math.round(avgHours * 10.0) / 10.0);
            }
        } else {
            dto.setOrdersPacking((int) expeditionRepository.countByStatus(ExpeditionStatus.PACKING));
            dto.setOrdersReadyToShip((int) expeditionRepository.countByStatus(ExpeditionStatus.READY_TO_SHIP));

            dto.setBoxesCreated((int) packageBoxRepository.count());
            dto.setBoxesFilled((int) packageBoxRepository.countByStatus(BoxStatus.FULL));
            dto.setPartialBoxes((int) packageBoxRepository.countByStatus(BoxStatus.PARTIALLY_FILLED));
            dto.setBoxesShipped((int) packageBoxRepository.countByStatus(BoxStatus.SHIPPED));

            List<Expedition> delivered = expeditionRepository.findByStatus(ExpeditionStatus.DELIVERED).stream()
                    .filter(e -> e.getStartedAt() != null && e.getCompletedAt() != null)
                    .collect(Collectors.toList());

            if (!delivered.isEmpty()) {
                double avgHours = delivered.stream()
                        .mapToLong(e -> Duration.between(e.getStartedAt(), e.getCompletedAt()).toHours())
                        .average()
                        .orElse(0);
                dto.setAveragePackingTimeHours(Math.round(avgHours * 10.0) / 10.0);
            }
        }

        return dto;
    }


    @Transactional
    public ExpeditionResponseDto autoCreateWhenPackagingStepActive(String stepId, User user) {
        ProductionStepEntity step = stepRepository.findById(stepId)
                .orElseThrow(() -> new NotFoundException("Step not found"));

        String orderId = step.getOrderId();
        if (orderId == null) return null;

        Optional<Expedition> existing = expeditionRepository.findByOrderId(orderId);
        if (existing.isPresent()) {
            Expedition exp = existing.get();
            if (exp.getStatus() == ExpeditionStatus.PREPARING) {
                exp.setStatus(ExpeditionStatus.PACKING);
                exp.setUpdatedAt(LocalDateTime.now());
                expeditionRepository.save(exp);
            }
            return toDto(exp);
        }

        return createExpedition(orderId, user);
    }


    private void updateExpeditionTotals(Expedition expedition) {
        List<PackageBox> boxes = packageBoxRepository.findByExpeditionIdOrderByBoxNumberAsc(expedition.getId());

        int packed = boxes.stream().mapToInt(PackageBox::getCurrentQuantity).sum();
        int filled = (int) boxes.stream().filter(b -> b.getStatus() == BoxStatus.FULL).count();
        int partial = (int) boxes.stream().filter(b -> b.getStatus() == BoxStatus.PARTIALLY_FILLED).count();

        expedition.setPackedQuantity(packed);
        expedition.setRemainingQuantity(expedition.getTotalQuantity() - packed);
        expedition.setFilledBoxes(filled);
        expedition.setPartialBoxes(partial);
        expedition.setUpdatedAt(LocalDateTime.now());

        if (packed == 0 && expedition.getStartedAt() == null) {
            expedition.setStartedAt(LocalDateTime.now());
        }

        if (packed >= expedition.getTotalQuantity() && expedition.getStatus() == ExpeditionStatus.PACKING) {
            expedition.setStatus(ExpeditionStatus.PREPARING);
        }

        expeditionRepository.save(expedition);
    }

    private int getMaxPackableQuantity(Expedition expedition) {
        if (expedition.getOrderId() == null) return expedition.getTotalQuantity();

        List<ProductionStepEntity> steps = stepRepository.findByOrderIdOrderBySequenceOrderAsc(expedition.getOrderId());
        if (steps.isEmpty()) return expedition.getTotalQuantity();

        return steps.stream()
                .filter(s -> s.getCompletedQuantity() != null)
                .mapToInt(ProductionStepEntity::getCompletedQuantity)
                .sum();
    }

    private int findUnitsPerBox(Orders order) {
        if (order.getItems() == null || order.getItems().isEmpty()) return 1;

        String productId = order.getItems().get(0).getProductId();
        if (productId == null) return 1;

        return productRepository.findById(productId)
                .map(p -> p.getUnitsPerBox() != null && p.getUnitsPerBox() > 0 ? p.getUnitsPerBox() : 1)
                .orElse(1);
    }

    private ExpeditionResponseDto toDto(Expedition expedition) {
        ExpeditionResponseDto dto = new ExpeditionResponseDto();
        dto.setId(expedition.getId());
        dto.setOrderId(expedition.getOrderId());
        dto.setOrganizationId(expedition.getOrganizationId());
        dto.setStatus(expedition.getStatus());
        dto.setTotalQuantity(expedition.getTotalQuantity());
        dto.setPackedQuantity(expedition.getPackedQuantity());
        dto.setRemainingQuantity(expedition.getRemainingQuantity());
        dto.setRequiredBoxes(expedition.getRequiredBoxes());
        dto.setFilledBoxes(expedition.getFilledBoxes());
        dto.setPartialBoxes(expedition.getPartialBoxes());
        dto.setUnitsPerBox(expedition.getUnitsPerBox());
        dto.setStartedAt(expedition.getStartedAt());
        dto.setCompletedAt(expedition.getCompletedAt());
        dto.setCreatedBy(expedition.getCreatedBy());
        dto.setCreatedAt(expedition.getCreatedAt());
        dto.setUpdatedAt(expedition.getUpdatedAt());

        List<PackageBox> boxes = packageBoxRepository.findByExpeditionIdOrderByBoxNumberAsc(expedition.getId());
        dto.setBoxes(boxes.stream().map(this::toBoxDto).collect(Collectors.toList()));

        return dto;
    }

    private PackageBoxResponseDto toBoxDto(PackageBox box) {
        PackageBoxResponseDto dto = new PackageBoxResponseDto();
        dto.setId(box.getId());
        dto.setExpeditionId(box.getExpeditionId());
        dto.setBoxNumber(box.getBoxNumber());
        dto.setCapacity(box.getCapacity());
        dto.setCurrentQuantity(box.getCurrentQuantity());
        dto.setRemainingCapacity(box.getRemainingCapacity());
        dto.setStatus(box.getStatus());
        dto.setBarcode(box.getBarcode());
        dto.setCreatedAt(box.getCreatedAt());
        return dto;
    }
}
