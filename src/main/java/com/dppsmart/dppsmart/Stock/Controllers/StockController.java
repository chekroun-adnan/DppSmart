package com.dppsmart.dppsmart.Stock.Controllers;


import com.dppsmart.dppsmart.Stock.DTO.CreateStockDTO;
import com.dppsmart.dppsmart.Stock.DTO.UpdatedStockDTO;
import com.dppsmart.dppsmart.Stock.Services.StockService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/stock")
public class StockController {

    @Autowired
    private StockService stockService;

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> createStock(@RequestBody @Valid CreateStockDTO dto){
        stockService.createStock(dto);
        return ResponseEntity.ok("Stock Created SuccessFully");
    }

    @PutMapping("/update")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> updateStock(@RequestBody @Valid UpdatedStockDTO dto){
        stockService.updateStock(dto);
        return ResponseEntity.ok("Stock Updated SuccessFully");
    }


    @DeleteMapping("/delete")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> deleteStock(@RequestParam String id){
        stockService.deleteStock(id);
        return ResponseEntity.noContent().build();
    }



}
