package com.dppsmart.dppsmart.Billing.Services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.time.Year;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class InvoiceNumberGenerator {

    @Autowired private MongoTemplate mongoTemplate;

    public String generateQuoteNumber(String organizationId) {
        return generateNumber("DEV", organizationId, "quotes", "quoteNumber");
    }

    public String generateInvoiceNumber(String organizationId) {
        return generateNumber("FAC", organizationId, "invoices", "invoiceNumber");
    }

    private String generateNumber(String prefix, String organizationId, String collection, String field) {
        String year = String.valueOf(Year.now().getValue());
        String regex = "^" + prefix + "-" + year + "-(\\d+)$";

        Query query = Query.query(Criteria.where(field).regex(prefix + "-" + year + "-\\d+"));
        query.with(Sort.by(Sort.Direction.DESC, field));
        query.limit(1);

        org.bson.Document doc = mongoTemplate.findOne(query, org.bson.Document.class, collection);
        int nextSeq = 1;

        if (doc != null) {
            String lastVal = doc.getString(field);
            if (lastVal != null) {
                Matcher m = Pattern.compile(regex).matcher(lastVal);
                if (m.find()) {
                    nextSeq = Integer.parseInt(m.group(1)) + 1;
                }
            }
        }

        return String.format("%s-%s-%04d", prefix, year, nextSeq);
    }
}
