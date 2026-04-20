package com.dppsmart.dppsmart.Stock.Services;


import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.dppsmart.dppsmart.Organization.Entities.Organization;
import com.dppsmart.dppsmart.Organization.Repositories.OrganizationRepository;
import com.dppsmart.dppsmart.Stock.DTO.CreateStockDTO;
import com.dppsmart.dppsmart.Stock.Entities.Stock;
import com.dppsmart.dppsmart.Stock.Mapper.StockMapper;
import com.dppsmart.dppsmart.Stock.Repositories.StockRepository;
import com.dppsmart.dppsmart.User.Entities.User;
import com.dppsmart.dppsmart.User.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

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

    public Stock createStock(CreateStockDTO dto) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUser = auth.getName();

        User user = userRepository.findByEmail(currentUser)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization not found"));

        if (!organization.getCreatedByUserId().equals(user.getId())) {
            throw new RuntimeException("You cannot assign stock to this organization");
        }

        Stock stock = stockMapper.toEntity(dto);

        stock.setId(NanoIdUtils.randomNanoId());
        stock.setOrganizationId(organization.getId());
        stock.setCreatedBy(currentUser);

        return stockRepository.save(stock);
    }
}
