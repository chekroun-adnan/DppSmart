package com.dppsmart.dppsmart.Stock.Controllers;


import com.dppsmart.dppsmart.Stock.DTO.CreateStockDTO;
import com.dppsmart.dppsmart.Stock.Services.StockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/stock")
public class StockController {

    @Autowired
    private StockService stockService;

    @PostMapping("/create")
    public ResponseEntity<?> createStock(@RequestBody CreateStockDTO dto){
        stockService.createStock(dto);
        return ResponseEntity.ok("Stock Created SuccessFully");
    }
}
