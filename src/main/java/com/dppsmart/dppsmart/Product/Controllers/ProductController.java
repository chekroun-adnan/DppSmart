package com.dppsmart.dppsmart.Product.Controllers;

import com.dppsmart.dppsmart.Product.DTO.CreateProductDto;
import com.dppsmart.dppsmart.Product.DTO.ProductResponseDto;
import com.dppsmart.dppsmart.Product.Services.ProductService;
import com.dppsmart.dppsmart.Scan.Services.ScanService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final ScanService scanService;

    public ProductController(ProductService productService, ScanService scanService) {
        this.productService = productService;
        this.scanService = scanService;
    }

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductResponseDto create(@RequestBody @Valid CreateProductDto dto) {
        return productService.createProduct(dto);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','EMPLOYEE','CLIENT')")
    public ProductResponseDto getById(@PathVariable String id) {
        return productService.getProductById(id);
    }

    @GetMapping("/{id}/dpp")
    public ProductResponseDto getDpp(@PathVariable String id, HttpServletRequest request) {
        scanService.recordDppOpen(id, request);
        return productService.getDpp(id);
    }

    @PutMapping("/update")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductResponseDto updateProduct(@RequestBody @Valid CreateProductDto dto) {

        return productService.updateProduct(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public String deleteProduct(@PathVariable String id) {

        productService.deleteProduct(id);
        return "Product deleted successfully";
    }

    @PostMapping("/{id}/image")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ProductResponseDto uploadProductImage(@PathVariable String id, @RequestParam("file") MultipartFile file) {
        return productService.uploadProductImage(id, file);
    }

    @GetMapping("/get/all")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN','CLIENT','EMPLOYEE')")
    public ResponseEntity<?>getAllProducts(){
        List<ProductResponseDto> products = productService.getAllProducts();
        return ResponseEntity.status(HttpStatus.OK).body(products);
    }

    @PostMapping("/import/csv")
    @PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")
    public ResponseEntity<?> importProductsFromCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam("organizationId") String organizationId) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        List<ProductResponseDto> products = productService.importProductsFromCsv(file, organizationId);
        return ResponseEntity.status(HttpStatus.OK).body(products);
    }
}
