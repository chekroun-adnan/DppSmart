package com.dppsmart.dppsmart.SupplyChain.DTO;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class StockReceivingResultDTO {

    public enum Action { UPDATED_EXISTING_STOCK, CREATED_NEW_STOCK }
    public enum MatchedBy { MATERIAL_ID, MATERIAL_NAME_UNIT, REFERENCE_CODE, NO_MATCH }

    private Action action;
    private MatchedBy matchedBy;
    private String stockId;
    private String materialName;
    private int receivedQuantity;
    private int previousQuantity;
    private int newQuantity;
    private String primaryReferenceCode;
    private String receivedReferenceCode;
    private List<String> alternativeRefCodes;
}
