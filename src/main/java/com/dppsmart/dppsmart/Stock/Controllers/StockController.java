package com.dppsmart.dppsmart.Stock.Controllers;


import com.dppsmart.dppsmart.Stock.DTO.CreateStockDTO;
import com.dppsmart.dppsmart.Stock.DTO.UpdatedStockDTO;
import com.dppsmart.dppsmart.Stock.Services.StockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/stock")
public class StockController {

    @Autowired
    private StockService stockService;

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> createStock(@RequestBody CreateStockDTO dto){
        stockService.createStock(dto);
        return ResponseEntity.ok("Stock Created SuccessFully");
    }

    @PutMapping("/update")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> updateStock(@RequestBody UpdatedStockDTO dto){
        stockService.updateStock(dto);
        return ResponseEntity.ok("Stock Updated SuccessFully");
    }


    @DeleteMapping("/delete")
    @PreAuthorize("hasRole('ADMIN')")
        public  ResponseEntity<?> deleteStock(@RequestParam String id){
        try{
            stockService.deleteStock(id);
            return ResponseEntity.ok("Stock Deleted SuccessFully");
        }catch (Exception e) {
            throw new RuntimeException(e.getMessage());
        }
    }



}
