package com.dppsmart.dppsmart.Billing.Services;

import com.ibm.icu.text.RuleBasedNumberFormat;
import java.util.Locale;

public class NumberToWordsConverter {

    public static String convertToWords(double amount, String currencyCode) {
        if (amount == 0) {
            return "Zéro";
        }

        long mainUnit = (long) amount;
        long fractionalUnit = Math.round((amount - mainUnit) * 100);

        RuleBasedNumberFormat format = new RuleBasedNumberFormat(Locale.FRANCE, RuleBasedNumberFormat.SPELLOUT);

        String mainWords = format.format(mainUnit);
        
        String currencyName = "dirhams marocains";
        if ("EUR".equalsIgnoreCase(currencyCode)) {
            currencyName = "euros";
        } else if ("USD".equalsIgnoreCase(currencyCode)) {
            currencyName = "dollars américains";
        }

        StringBuilder result = new StringBuilder();
        result.append(mainWords).append(" ").append(currencyName);

        if (fractionalUnit > 0) {
            String fractionalWords = format.format(fractionalUnit);
            result.append(" et ").append(fractionalWords).append(" centimes");
        }

        result.append(" seulement.");

        String finalString = result.toString();
        if (finalString.length() > 0) {
            finalString = finalString.substring(0, 1).toUpperCase() + finalString.substring(1);
        }

        return finalString;
    }
}
