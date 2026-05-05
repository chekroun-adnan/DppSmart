package com.dppsmart.dppsmart.Config;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Data
public class N8nConfig {

    @Value("${n8n.webhook.user}")
    private String userWebhook;

    @Value("${n8n.webhook.login}")
    private String loginWebhook;

}
