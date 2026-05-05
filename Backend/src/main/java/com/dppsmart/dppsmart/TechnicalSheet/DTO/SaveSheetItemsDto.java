package com.dppsmart.dppsmart.TechnicalSheet.DTO;

import jakarta.validation.Valid;
import lombok.Data;

import java.util.List;

@Data
public class SaveSheetItemsDto {
    @Valid
    private List<MaterialSheetItemDto> materialItems;
    @Valid
    private List<OperationSheetItemDto> operationItems;
}
