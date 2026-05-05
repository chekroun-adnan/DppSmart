package com.dppsmart.dppsmart.Stock.Services;


import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Common.Exceptions.ForbiddenException;
import com.dppsmart.dppsmart.Common.Exceptions.NotFoundException;
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
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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

    @CacheEvict(value = {"stocks", "allStocks"}, allEntries = true)
    public Stock createStock(CreateStockDTO dto) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to create stock");
        }

        if (!permissionService.canAccessOrganization(user, organization.getId())) {
            throw new ForbiddenException("You are not allowed to use this organization");
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

    @CacheEvict(value = {"stocks", "allStocks"}, allEntries = true)
    public Stock updateStock(UpdatedStockDTO dto) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Stock stock = stockRepository.findById(dto.getId())
                .orElseThrow(() -> new NotFoundException("Stock not found"));

        Organization organization = organizationRepository.findById(stock.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to update stock");
        }

        if (!permissionService.canAccessOrganization(user, stock.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to update this stock");
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

        return stock;
    }
    @Cacheable(value = "allStocks")
    public List<Stock> getAll() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));

        return stockRepository.findAll().stream()
                .filter(s -> user.getRole() == Roles.ADMIN || permissionService.canAccessOrganization(user, s.getOrganizationId()))
                .toList();
    }

    @CacheEvict(value = {"stocks", "allStocks"}, allEntries = true)
    public void deleteStock(String stockId) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Stock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new NotFoundException("Stock not found"));

        Organization organization = organizationRepository.findById(stock.getOrganizationId())
                .orElseThrow(() -> new NotFoundException("Organization not found"));

        if (user.getRole() == Roles.CLIENT || user.getRole() == Roles.EMPLOYEE) {
            throw new ForbiddenException("You are not allowed to delete stock");
        }

        if (!permissionService.canAccessOrganization(user, stock.getOrganizationId())) {
            throw new ForbiddenException("You are not allowed to delete this stock");
        }

        stockRepository.delete(stock);

        if (organization.getStocks() != null) {
            organization.getStocks().removeIf(s -> s.getId().equals(stockId));
            organizationRepository.save(organization);
        }
    }

}

