package com.dppsmart.dppsmart.Stock.Services;


import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Security.PermissionService;
import com.dppsmart.dppsmart.Stock.DTO.CreateStockDTO;
import com.dppsmart.dppsmart.Stock.DTO.StockQuantityDTO;
import com.dppsmart.dppsmart.Stock.DTO.UpdatedStockDTO;
import com.dppsmart.dppsmart.Stock.Entities.Stock;
import com.dppsmart.dppsmart.Stock.Mapper.StockMapper;
import com.dppsmart.dppsmart.Stock.Repositories.StockRepository;
import com.dppsmart.dppsmart.User.Entities.Roles;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class StockService {

    @Autowired
    private StockRepository stockRepository;
    @Autowired
    private OrganizationRepository organizationRepository;
    @Autowired
    private StockMapper stockMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PermissionService permissionService;

    public Stock createStock(CreateStockDTO dto) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization not found"));

        if (user.getRole() != Roles.ADMIN && user.getRole() != Roles.SUBADMIN) {
            throw new RuntimeException("You are not allowed to create stock");
        }

        if (user.getRole() == Roles.SUBADMIN &&
                !user.getOrganizationId().equals(organization.getId())) {
            throw new RuntimeException("SUB_ADMIN cannot assign stock to another organization");
        }

        Stock stock = stockMapper.toEntity(dto);
        stock.setId(NanoIdUtils.randomNanoId());
        stock.setOrganizationId(organization.getId());
        stock.setCreatedBy(email);

        Stock savedStock = stockRepository.save(stock);

        if (organization.getStocks() == null) {
            organization.setStocks(new ArrayList<>());
        }

        organization.getStocks().add(savedStock);

        organizationRepository.save(organization);

        return savedStock;
    }

    public Stock updateStock(UpdatedStockDTO dto) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User Not Found"));

        Stock stock = stockRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("Stock Not Found"));

        Organization organization = organizationRepository.findById(stock.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization Not Found"));

        if (user.getRole() != Roles.ADMIN && user.getRole() != Roles.SUBADMIN) {
            throw new RuntimeException("You are not allowed to update stock");
        }

        if (user.getRole() == Roles.SUBADMIN &&
                !user.getOrganizationId().equals(stock.getOrganizationId())) {
            throw new RuntimeException("SUB_ADMIN cannot update stock of another organization");
        }

        Stock updatedStock = applyUpdates(stock, dto);
        Stock savedStock = stockRepository.save(updatedStock);

        List<Stock> stocks = organization.getStocks();

        if (stocks != null) {
            for (int i = 0; i < stocks.size(); i++) {
                if (stocks.get(i).getId().equals(savedStock.getId())) {
                    stocks.set(i, savedStock);
                    break;
                }
            }
        }

        organization.setStocks(stocks);
        organizationRepository.save(organization);

        return savedStock;
    }


    private Stock applyUpdates(Stock stock, UpdatedStockDTO dto) {

        if (dto.getMaterialName() != null) {
            stock.setMaterialName(dto.getMaterialName());
        }

        if (dto.getQuantity() >= 0) {
            stock.setQuantity(dto.getQuantity());
        }

        if (dto.getUnit() != null) {
            stock.setUnit(dto.getUnit());
        }

        if (dto.getMinimumThreshold() >= 0) {
            stock.setMinimumThreshold(dto.getMinimumThreshold());
        }

        return stockRepository.save(stock);
    }
    public void deleteStock(String stockId) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User Not Found"));

        Stock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new RuntimeException("Stock Not Found"));

        Organization organization = organizationRepository.findById(stock.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization Not Found"));

        if (user.getRole() != Roles.ADMIN && user.getRole() != Roles.SUBADMIN) {
            throw new RuntimeException("You are not allowed to delete this stock");
        }

        if (user.getRole() == Roles.SUBADMIN &&
                !user.getOrganizationId().equals(stock.getOrganizationId())) {
            throw new RuntimeException("SUB_ADMIN cannot delete stock from another organization");
        }

        stockRepository.delete(stock);

        if (organization.getStocks() != null) {
            organization.getStocks().removeIf(s -> s.getId().equals(stockId));
            organizationRepository.save(organization);
        }
    }



}

