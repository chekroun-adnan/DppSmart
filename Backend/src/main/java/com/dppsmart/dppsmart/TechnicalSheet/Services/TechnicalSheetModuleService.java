package com.dppsmart.dppsmart.TechnicalSheet.Services;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
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
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TechnicalSheetModuleService {

    private final TechnicalSheetRepository sheetRepository;
    private final MaterialSheetItemRepository materialItemRepository;
    private final OperationSheetItemRepository operationItemRepository;
    private final MaterialRepository materialRepository;
    private final OperationRepository operationRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public TechnicalSheetResponseDto createSheet(CreateTechnicalSheetDto dto) {
        User user = getCurrentUser();
        checkAccess(user, dto.getOrganizationId());

        TechnicalSheet sheet = new TechnicalSheet();
        sheet.setId(NanoIdUtils.randomNanoId());
        sheet.setName(dto.getName());
        sheet.setType(dto.getType());
        sheet.setDescription(dto.getDescription());
        sheet.setOrganizationId(dto.getOrganizationId());
        sheet.setProductId(dto.getProductId());
        sheet.setCreatedBy(user.getEmail());
        sheet.setUpdatedBy(user.getEmail());
        sheet.setCreatedAt(LocalDateTime.now());
        sheet.setUpdatedAt(LocalDateTime.now());
        return TechnicalSheetModuleMapper.toDto(sheetRepository.save(sheet));
    }

    public TechnicalSheetResponseDto updateSheet(String id, UpdateTechnicalSheetDto dto) {
        User user = getCurrentUser();
        TechnicalSheet sheet = findSheet(id);
        checkAccess(user, sheet.getOrganizationId());

        if (dto.getName() != null && !dto.getName().isBlank()) sheet.setName(dto.getName());
        if (dto.getDescription() != null) sheet.setDescription(dto.getDescription());
        sheet.setUpdatedBy(user.getEmail());
        sheet.setUpdatedAt(LocalDateTime.now());
        return TechnicalSheetModuleMapper.toDto(sheetRepository.save(sheet));
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
        return sheetRepository.findByProductId(productId).stream()
                .filter(s -> permissionService.canAccessOrganization(user, s.getOrganizationId()))
                .map(TechnicalSheetModuleMapper::toDto)
                .toList();
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
            item.setQuantity(dto.getQuantity());
            item.setUnit(dto.getUnit());
            item.setNotes(dto.getNotes());
            return item;
        }).collect(Collectors.toList());

        materialItemRepository.saveAll(saved);
        return enrichMaterialItems(saved);
    }

    public List<MaterialSheetItemDto> getMaterialItems(String sheetId) {
        User user = getCurrentUser();
        checkAccess(user, findSheet(sheetId).getOrganizationId());
        List<MaterialSheetItem> items = materialItemRepository.findByTechnicalSheetId(sheetId);
        return enrichMaterialItems(items);
    }

    private List<MaterialSheetItemDto> enrichMaterialItems(List<MaterialSheetItem> items) {
        List<String> ids = items.stream().map(MaterialSheetItem::getMaterialId).distinct().toList();
        Map<String, Material> matMap = materialRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Material::getId, Function.identity()));
        return items.stream()
                .map(i -> {
                    Material m = matMap.get(i.getMaterialId());
                    return TechnicalSheetModuleMapper.toDto(i,
                            m != null ? m.getName() : "—",
                            m != null ? m.getReferenceCode() : "—");
                })
                .toList();
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
            item.setUserId(dto.getUserId());
            item.setStepOrder(dto.getStepOrder());
            item.setDurationEstimate(dto.getDurationEstimate());
            item.setNotes(dto.getNotes());
            return item;
        }).collect(Collectors.toList());

        operationItemRepository.saveAll(saved);
        return enrichOperationItems(saved);
    }

    public List<OperationSheetItemDto> getOperationItems(String sheetId) {
        User user = getCurrentUser();
        checkAccess(user, findSheet(sheetId).getOrganizationId());
        List<OperationSheetItem> items = operationItemRepository.findByTechnicalSheetIdOrderByStepOrderAsc(sheetId);
        return enrichOperationItems(items);
    }

    private List<OperationSheetItemDto> enrichOperationItems(List<OperationSheetItem> items) {
        List<String> opIds   = items.stream().map(OperationSheetItem::getOperationId).distinct().toList();
        List<String> userIds = items.stream().map(OperationSheetItem::getUserId).distinct().toList();

        Map<String, Operation> opMap = operationRepository.findAllById(opIds).stream()
                .collect(Collectors.toMap(Operation::getId, Function.identity()));
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return items.stream()
                .map(i -> {
                    Operation op = opMap.get(i.getOperationId());
                    User u = userMap.get(i.getUserId());
                    return TechnicalSheetModuleMapper.toDto(i,
                            op != null ? op.getName() : "—",
                            u != null ? u.getName() : "—");
                })
                .toList();
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
