package com.immersa.service;

import com.immersa.model.Asset;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@Service
public class AiService {

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Value("${storage.local.location:./data/assets}")
    private String localLocation;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 调用 AI 服务生成深度图
     * 
     * @param asset 原始图片资源
     * @return 深度图的访问 URL
     */
    public String generateDepth(Asset asset) {
        try {
            // 获取本地文件路径
            Path filePath = Paths.get(localLocation).resolve(asset.getStoragePath());
            File file = filePath.toFile();

            if (!file.exists()) {
                throw new RuntimeException("资源文件不存在: " + filePath);
            }

            // 构建 Multipart 请求
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new FileSystemResource(file));

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // 调用 Python AI 服务
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    aiServiceUrl + "/infer/depth/",
                    org.springframework.http.HttpMethod.POST,
                    requestEntity,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();

                // 检查是否成功
                Boolean success = (Boolean) responseBody.get("success");
                if (Boolean.TRUE.equals(success)) {
                    // 获取结果路径并构建完整 URL
                    String resultPath = (String) responseBody.get("result_path");
                    if (resultPath != null) {
                        // 返回 AI 服务的结果 URL
                        String fileName = Paths.get(resultPath).getFileName().toString();
                        return aiServiceUrl + "/results/" + fileName;
                    }
                }

                throw new RuntimeException("AI 服务返回失败");
            }
            throw new RuntimeException("AI 服务调用失败: " + response.getStatusCode());

        } catch (Exception e) {
            throw new RuntimeException("调用 AI 服务失败: " + e.getMessage(), e);
        }
    }
}
