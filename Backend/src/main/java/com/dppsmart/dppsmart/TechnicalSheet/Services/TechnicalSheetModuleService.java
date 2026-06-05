package com.dppsmart.dppsmart.TechnicalSheet.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Audit.Services.AuditService;
import com.dppsmart.dppsmart.Common.Exceptions.BadRequestException;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
import com.dppsmart.dppsmart.MaterialStock.Entities.MaterialStock;
import com.dppsmart.dppsmart.MaterialStock.Repositories.MaterialStockRepository;
import com.dppsmart.dppsmart.Notification.Entities.Notification.NotificationType;
import com.dppsmart.dppsmart.Notification.Services.NotificationServiceImpl;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.TechnicalSheet.DTO.*;
import com.dppsmart.dppsmart.TechnicalSheet.Entities.*;
import com.dppsmart.dppsmart.TechnicalSheet.Mapper.TechnicalSheetModuleMapper;
import com.dppsmart.dppsmart.TechnicalSheet.Repositories.*;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TechnicalSheetModuleService {

    private final TechnicalSheetRepository sheetRepository;
    private final MaterialSheetItemRepository materialItemRepository;
    private final OperationSheetItemRepository operationItemRepository;
    private final MaterialStockRepository materialStockRepository;
    private final OperationRepository operationRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationServiceImpl notificationService;

    

    public TechnicalSheetResponseDto createSheet(CreateTechnicalSheetDto dto) {
        User user = getCurrentUser();
        checkAccess(user, dto.getOrganizationId());

        int nextVersion = 1;
        if (dto.getProductId() != null && !dto.getProductId().isBlank()) {
            List<TechnicalSheet> existing = sheetRepository.findByProductIdOrderByVersionDesc(dto.getProductId());
            if (!existing.isEmpty() && existing.get(0).getVersion() != null) {
                nextVersion = existing.get(0).getVersion() + 1;
            }
        }

        TechnicalSheet sheet = new TechnicalSheet();
        sheet.setId(NanoIdUtils.randomNanoId());
        sheet.setName(dto.getName());
        sheet.setType(dto.getType());
        sheet.setDescription(dto.getDescription());
        sheet.setNotes(dto.getNotes());
        sheet.setOrganizationId(dto.getOrganizationId());
        sheet.setProductId(dto.getProductId());
        sheet.setVersion(nextVersion);
        sheet.setStatus(TechnicalSheetStatus.ACTIVE);
        sheet.setTargetQuantity(dto.getTargetQuantity());
        sheet.setCreatedBy(user.getEmail());
        sheet.setUpdatedBy(user.getEmail());
        sheet.setCreatedAt(LocalDateTime.now());
        sheet.setUpdatedAt(LocalDateTime.now());

        TechnicalSheet saved = sheetRepository.save(sheet);
        auditService.log("TechnicalSheet", saved.getId(), "CREATE", saved.getOrganizationId(), null,
                "Technical sheet created: " + saved.getName() + " v" + saved.getVersion());
        notificationService.createNotification(user.getId(), "Technical Sheet Created",
                saved.getName() + " v" + saved.getVersion() + " has been created",
                NotificationType.SYSTEM, "/technical-sheets/" + saved.getId());
        return TechnicalSheetModuleMapper.toDto(saved);
    }

    

    public TechnicalSheetResponseDto updateSheet(String id, UpdateTechnicalSheetDto dto) {
        User user = getCurrentUser();
        TechnicalSheet sheet = findSheet(id);
        checkAccess(user, sheet.getOrganizationId());

        if (dto.getName() != null && !dto.getName().isBlank()) sheet.setName(dto.getName());
        if (dto.getDescription() != null) sheet.setDescription(dto.getDescription());
        if (dto.getNotes() != null) sheet.setNotes(dto.getNotes());
        if (dto.getTargetQuantity() != null) sheet.setTargetQuantity(dto.getTargetQuantity());
        sheet.setUpdatedBy(user.getEmail());
        sheet.setUpdatedAt(LocalDateTime.now());

        TechnicalSheet saved = sheetRepository.save(sheet);
        auditService.log("TechnicalSheet", saved.getId(), "UPDATE", saved.getOrganizationId(), null,
                "Technical sheet updated: " + saved.getName());
        return TechnicalSheetModuleMapper.toDto(saved);
    }

    

    @Transactional
    public TechnicalSheetResponseDto setActive(String id) {
        User user = getCurrentUser();
        TechnicalSheet sheet = findSheet(id);
        checkAccess(user, sheet.getOrganizationId());

        if (sheet.getStatus() == TechnicalSheetStatus.ARCHIVED) {
            throw new BadRequestException("Cannot activate an archived technical sheet.");
        }

        if (sheet.getProductId() != null) {
            sheetRepository.findFirstByProductIdAndStatusOrderByVersionDesc(sheet.getProductId(), TechnicalSheetStatus.ACTIVE)
                    .ifPresent(prev -> {
                        if (!prev.getId().equals(sheet.getId())) {
                            prev.setStatus(TechnicalSheetStatus.INACTIVE);
                            prev.setUpdatedAt(LocalDateTime.now());
                            sheetRepository.save(prev);
                        }
                    });
        }

        sheet.setStatus(TechnicalSheetStatus.ACTIVE);
        sheet.setUpdatedAt(LocalDateTime.now());
        sheet.setUpdatedBy(user.getEmail());
        TechnicalSheet saved = sheetRepository.save(sheet);
        auditService.log("TechnicalSheet", saved.getId(), "ACTIVATE", saved.getOrganizationId(), null,
                "Activated v" + saved.getVersion() + " for product " + saved.getProductId());
        return TechnicalSheetModuleMapper.toDto(saved);
    }

    public TechnicalSheetResponseDto archiveSheet(String id) {
        User user = getCurrentUser();
        TechnicalSheet sheet = findSheet(id);
        checkAccess(user, sheet.getOrganizationId());

        sheet.setStatus(TechnicalSheetStatus.ARCHIVED);
        sheet.setUpdatedAt(LocalDateTime.now());
        sheet.setUpdatedBy(user.getEmail());
        TechnicalSheet saved = sheetRepository.save(sheet);
        auditService.log("TechnicalSheet", saved.getId(), "ARCHIVE", saved.getOrganizationId(), null,
                "Archived: " + saved.getName());
        return TechnicalSheetModuleMapper.toDto(saved);
    }

    

    @Transactional
    public TechnicalSheetResponseDto createNewVersion(String baseSheetId) {
        User user = getCurrentUser();
        TechnicalSheet base = findSheet(baseSheetId);
        checkAccess(user, base.getOrganizationId());

        List<TechnicalSheet> existing = sheetRepository.findByProductIdOrderByVersionDesc(base.getProductId());
        int nextVersion = existing.isEmpty() ? 1
                : (existing.get(0).getVersion() != null ? existing.get(0).getVersion() + 1 : 1);

        TechnicalSheet newSheet = new TechnicalSheet();
        newSheet.setId(NanoIdUtils.randomNanoId());
        newSheet.setName(base.getName());
        newSheet.setType(base.getType());
        newSheet.setDescription(base.getDescription());
        newSheet.setNotes(base.getNotes());
        newSheet.setOrganizationId(base.getOrganizationId());
        newSheet.setProductId(base.getProductId());
        newSheet.setVersion(nextVersion);
        newSheet.setStatus(TechnicalSheetStatus.INACTIVE);
        newSheet.setCreatedBy(user.getEmail());
        newSheet.setUpdatedBy(user.getEmail());
        newSheet.setCreatedAt(LocalDateTime.now());
        newSheet.setUpdatedAt(LocalDateTime.now());
        TechnicalSheet saved = sheetRepository.save(newSheet);

        List<MaterialSheetItem> baseItems = materialItemRepository.findByTechnicalSheetId(baseSheetId);
        List<MaterialSheetItem> copies = baseItems.stream().map(item -> {
            MaterialSheetItem copy = new MaterialSheetItem();
            copy.setId(NanoIdUtils.randomNanoId());
            copy.setTechnicalSheetId(saved.getId());
            copy.setMaterialId(item.getMaterialId());
            copy.setMaterialName(item.getMaterialName());
            copy.setQuantityPerUnit(item.getQuantityPerUnit());
            copy.setUnit(item.getUnit());
            copy.setWastePercentage(item.getWastePercentage());
            copy.setNotes(item.getNotes());
            return copy;
        }).collect(Collectors.toList());
        materialItemRepository.saveAll(copies);

        List<OperationSheetItem> baseOpItems = operationItemRepository.findByTechnicalSheetIdOrderByStepOrderAsc(baseSheetId);
        List<OperationSheetItem> opCopies = baseOpItems.stream().map(item -> {
            OperationSheetItem copy = new OperationSheetItem();
            copy.setId(NanoIdUtils.randomNanoId());
            copy.setTechnicalSheetId(saved.getId());
            copy.setOperationId(item.getOperationId());
            copy.setOperationName(item.getOperationName());
            copy.setUserId(item.getUserId());
            copy.setStepOrder(item.getStepOrder());
            copy.setDurationEstimate(item.getDurationEstimate());
            copy.setNotes(item.getNotes());
            copy.setInstructions(item.getInstructions());
            copy.setQualityCheckRequired(item.getQualityCheckRequired());
            copy.setCanRunInParallel(item.getCanRunInParallel());
            copy.setOverrideDefaultDuration(item.getOverrideDefaultDuration());
            copy.setOverrideExecutionCost(item.getOverrideExecutionCost());
            copy.setAssignedDepartment(item.getAssignedDepartment());
            return copy;
        }).collect(Collectors.toList());
        operationItemRepository.saveAll(opCopies);

        auditService.log("TechnicalSheet", saved.getId(), "NEW_VERSION", saved.getOrganizationId(), null,
                "New version v" + nextVersion + " created from v" + base.getVersion());
        return TechnicalSheetModuleMapper.toDto(saved);
    }

    

    public TechnicalSheetResponseDto getSheet(String id) {
        User user = getCurrentUser();
        TechnicalSheet sheet = findSheet(id);
        checkAccess(user, sheet.getOrganizationId());
        return TechnicalSheetModuleMapper.toDto(sheet);
    }

    public List<TechnicalSheetResponseDto> getAllSheets() {
        User user = getCurrentUser();
        return sheetRepository.findAll().stream()
                .filter(s -> permissionService.canAccessOrganization(user, s.getOrganizationId()))
                .map(TechnicalSheetModuleMapper::toDto)
                .toList();
    }

    public List<TechnicalSheetResponseDto> getSheetsByProduct(String productId) {
        User user = getCurrentUser();
        return sheetRepository.findByProductIdOrderByVersionDesc(productId).stream()
                .filter(s -> permissionService.canAccessOrganization(user, s.getOrganizationId()))
                .map(TechnicalSheetModuleMapper::toDto)
                .toList();
    }

    public Optional<TechnicalSheetResponseDto> getActiveSheetByProduct(String productId) {
        return sheetRepository.findFirstByProductIdAndStatusOrderByVersionDesc(productId, TechnicalSheetStatus.ACTIVE)
                .map(TechnicalSheetModuleMapper::toDto);
    }

    public List<TechnicalSheetResponseDto> getSheetsByOrg(String orgId) {
        User user = getCurrentUser();
        checkAccess(user, orgId);
        return sheetRepository.findByOrganizationId(orgId).stream()
                .map(TechnicalSheetModuleMapper::toDto)
                .toList();
    }

    

    @Transactional
    public void deleteSheet(String id) {
        User user = getCurrentUser();
        TechnicalSheet sheet = findSheet(id);
        checkAccess(user, sheet.getOrganizationId());

        materialItemRepository.deleteByTechnicalSheetId(id);
        operationItemRepository.deleteByTechnicalSheetId(id);
        sheetRepository.deleteById(id);
        auditService.log("TechnicalSheet", id, "DELETE", sheet.getOrganizationId(), null,
                "Technical sheet deleted: " + sheet.getName());
    }

    

    public BomCalculationResultDto calculateBom(String productId, int quantity, String organizationId) {
        TechnicalSheet sheet = sheetRepository.findFirstByProductIdAndStatusOrderByVersionDesc(productId, TechnicalSheetStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException(
                        "No active Bill of Materials for product: " + productId
                                + ". Please create and activate a technical sheet first."));

        List<MaterialSheetItem> items = materialItemRepository.findByTechnicalSheetId(sheet.getId());

        boolean overallSufficient = true;
        List<BomMaterialLineDto> lines = new ArrayList<>();

        for (MaterialSheetItem item : items) {
            double base = item.getQuantityPerUnit() != null ? item.getQuantityPerUnit() : 0.0;
            double waste = item.getWastePercentage() != null ? item.getWastePercentage() : 0.0;
            double required = quantity * base * (1.0 + waste / 100.0);
            required = Math.round(required * 100.0) / 100.0;

            MaterialStock stock = resolveStock(item, organizationId);
            int available = (stock != null && stock.getQuantity() != null) ? stock.getQuantity() : 0;
            double missing = Math.max(0, required - available);
            missing = Math.round(missing * 100.0) / 100.0;
            boolean sufficient = available >= required;
            if (!sufficient) overallSufficient = false;

            String resolvedId = stock != null ? stock.getId() : item.getMaterialId();
            String matName = stock != null ? stock.getName()
                    : (item.getMaterialName() != null ? item.getMaterialName() : "—");
            String unit = item.getUnit() != null ? item.getUnit()
                    : (stock != null ? stock.getUnit() : "");

            lines.add(new BomMaterialLineDto(resolvedId, matName, unit, base,
                    waste > 0 ? waste : null, required, available, missing, sufficient));
        }

        return new BomCalculationResultDto(productId, sheet.getId(), sheet.getVersion(),
                quantity, overallSufficient, lines);
    }

    

    @Transactional
    public List<MaterialSheetItemDto> saveMaterialItems(String sheetId, List<MaterialSheetItemDto> dtos) {
        User user = getCurrentUser();
        TechnicalSheet sheet = findSheet(sheetId);
        checkAccess(user, sheet.getOrganizationId());

        materialItemRepository.deleteByTechnicalSheetId(sheetId);

        List<MaterialSheetItem> saved = dtos.stream().map(dto -> {
            MaterialSheetItem item = new MaterialSheetItem();
            item.setId(NanoIdUtils.randomNanoId());
            item.setTechnicalSheetId(sheetId);
            item.setMaterialId(dto.getMaterialId());
            item.setMaterialName(dto.getMaterialName());
            item.setQuantityPerUnit(dto.getQuantityPerUnit());
            item.setUnit(dto.getUnit());
            item.setWastePercentage(dto.getWastePercentage());
            item.setNotes(dto.getNotes());
            if (dto.getMaterialId() != null) {
                materialStockRepository.findById(dto.getMaterialId())
                        .ifPresent(ms -> {
                            item.setReferenceCode(ms.getReferenceCode());
                            if (item.getMaterialName() == null || item.getMaterialName().isBlank()) {
                                item.setMaterialName(ms.getName());
                            }
                        });
            }
            if (item.getReferenceCode() == null && dto.getMaterialReference() != null) {
                item.setReferenceCode(dto.getMaterialReference());
            }
            return item;
        }).collect(Collectors.toList());

        materialItemRepository.saveAll(saved);
        auditService.log("TechnicalSheet", sheetId, "UPDATE_MATERIALS", sheet.getOrganizationId(), null,
                "BOM updated: " + saved.size() + " materials");
        return enrichMaterialItems(saved);
    }

    public List<MaterialSheetItemDto> getMaterialItems(String sheetId) {
        User user = getCurrentUser();
        checkAccess(user, findSheet(sheetId).getOrganizationId());
        return enrichMaterialItems(materialItemRepository.findByTechnicalSheetId(sheetId));
    }

    private List<MaterialSheetItemDto> enrichMaterialItems(List<MaterialSheetItem> items) {
        return items.stream().map(i -> {
            MaterialStock m = resolveStock(i, null);
            return TechnicalSheetModuleMapper.toDto(i,
                    m != null ? m.getName() : (i.getMaterialName() != null ? i.getMaterialName() : "—"),
                    m != null ? m.getReferenceCode() : (i.getReferenceCode() != null ? i.getReferenceCode() : "—"),
                    m != null ? m.getQuantity() : null);
        }).toList();
    }

    @Transactional
    public List<OperationSheetItemDto> saveOperationItems(String sheetId, List<OperationSheetItemDto> dtos) {
        User user = getCurrentUser();
        TechnicalSheet sheet = findSheet(sheetId);
        checkAccess(user, sheet.getOrganizationId());

        operationItemRepository.deleteByTechnicalSheetId(sheetId);

        List<OperationSheetItem> saved = dtos.stream().map(dto -> {
            OperationSheetItem item = new OperationSheetItem();
            item.setId(NanoIdUtils.randomNanoId());
            item.setTechnicalSheetId(sheetId);
            item.setOperationId(dto.getOperationId());
            item.setOperationName(dto.getOperationName());
            item.setUserId(dto.getUserId());
            item.setStepOrder(dto.getStepOrder());
            item.setDurationEstimate(dto.getDurationEstimate());
            item.setNotes(dto.getNotes());
            item.setInstructions(dto.getInstructions());
            item.setQualityCheckRequired(dto.getQualityCheckRequired());
            item.setCanRunInParallel(dto.getCanRunInParallel());
            item.setOverrideDefaultDuration(dto.getOverrideDefaultDuration());
            item.setOverrideExecutionCost(dto.getOverrideExecutionCost());
            item.setAssignedDepartment(dto.getAssignedDepartment());
            return item;
        }).collect(Collectors.toList());

        operationItemRepository.saveAll(saved);
        return enrichOperationItems(saved);
    }

    public List<OperationSheetItemDto> getOperationItems(String sheetId) {
        User user = getCurrentUser();
        checkAccess(user, findSheet(sheetId).getOrganizationId());
        return enrichOperationItems(
                operationItemRepository.findByTechnicalSheetIdOrderByStepOrderAsc(sheetId));
    }

    private List<OperationSheetItemDto> enrichOperationItems(List<OperationSheetItem> items) {
        List<String> opIds   = items.stream().map(OperationSheetItem::getOperationId).distinct().toList();
        List<String> userIds = items.stream().map(OperationSheetItem::getUserId).distinct().toList();
        Map<String, Operation> opMap = operationRepository.findAllById(opIds).stream()
                .collect(Collectors.toMap(Operation::getId, Function.identity()));
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return items.stream().map(i -> {
            Operation op = opMap.get(i.getOperationId());
            User u = userMap.get(i.getUserId());
            return TechnicalSheetModuleMapper.toDto(i,
                    op != null ? op.getName() : "—",
                    u != null ? u.getName() : "—");
        }).toList();
    }

    
    
    private MaterialStock resolveStock(MaterialSheetItem item, String organizationId) {

        if (item.getMaterialId() != null) {
            Optional<MaterialStock> byId = materialStockRepository.findById(item.getMaterialId());
            if (byId.isPresent()) return byId.get();
        }

        if (item.getReferenceCode() != null && !item.getReferenceCode().isBlank()) {
            if (organizationId != null) {
                Optional<MaterialStock> byRef = materialStockRepository
                        .findByReferenceCodeAndOrganizationId(item.getReferenceCode(), organizationId);
                if (byRef.isPresent()) return byRef.get();
            } else {

                List<MaterialStock> all = materialStockRepository.findAll();
                for (MaterialStock s : all) {
                    if (item.getReferenceCode().equalsIgnoreCase(s.getReferenceCode())) return s;
                }
            }
        }

        if (item.getMaterialName() != null && !item.getMaterialName().isBlank()) {
            if (organizationId != null) {
                Optional<MaterialStock> byName = materialStockRepository
                        .findFirstByNameIgnoreCaseAndOrganizationId(item.getMaterialName(), organizationId);
                if (byName.isPresent()) return byName.get();
            } else {
                List<MaterialStock> all = materialStockRepository.findAll();
                for (MaterialStock s : all) {
                    if (item.getMaterialName().equalsIgnoreCase(s.getName())) return s;
                }
            }
        }

        return null;
    }

    private TechnicalSheet findSheet(String id) {
        return sheetRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Technical sheet not found"));
    }

    private void checkAccess(User user, String orgId) {
        if (!permissionService.canAccessOrganization(user, orgId)) {
            throw new ForbiddenException("Access denied to this organization");
        }
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new ForbiddenException("Unauthenticated");
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
