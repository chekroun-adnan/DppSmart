package com.dppsmart.dppsmart.Product.Controllers;

import com.dppsmart.dppsmart.Product.DTO.CreateProductDto;
import com.dppsmart.dppsmart.Product.DTO.ProductResponseDto;
import com.dppsmart.dppsmart.Product.Services.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductResponseDto create(@RequestBody CreateProductDto dto) {
        return productService.createProduct(dto);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductResponseDto getById(@PathVariable String id) {
        return productService.getProductById(id);
    }

    @GetMapping("/{id}/dpp")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductResponseDto getDpp(@PathVariable String id) {
        return productService.getDpp(id);
    }

    @PutMapping("/update")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductResponseDto updateProduct(@RequestBody CreateProductDto dto) {

        return productService.updateProduct(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public String deleteProduct(@PathVariable String id) {

        productService.deleteProduct(id);
        return "Product deleted successfully";
    }

    @GetMapping("/get/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?>getAllProducts(){
        List<ProductResponseDto> products = productService.getAllProducts();
        return ResponseEntity.status(HttpStatus.CREATED).body(products);
    }
}
