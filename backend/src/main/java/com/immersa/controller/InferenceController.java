package com.immersa.controller;

import com.immersa.model.Asset;
import com.immersa.repository.AssetRepository;
import com.immersa.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * AI 推理控制器
 * 处理深度图生成等 AI 相关请求
 */
@RestController
@RequestMapping("/api/infer")
@RequiredArgsConstructor
@Slf4j
public class InferenceController {

    private final AssetRepository assetRepository;
    private final AiService aiService;

    /**
     * 生成深度图
     * 接收 assetId，调用 AI 服务处理，返回结果 URL
     */
    @PostMapping("/depth")
    public ResponseEntity<Map<String, Object>> generateDepth(@RequestParam("assetId") String assetId) {
        try {
            UUID id = UUID.fromString(assetId);
            Asset asset = assetRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Asset not found: " + assetId));

            log.info("开始为资源 {} 生成深度图", assetId);

            String resultUrl = aiService.generateDepth(asset);

            log.info("深度图生成完成: {}", resultUrl);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "resultUrl", resultUrl != null ? resultUrl : ""));
        } catch (Exception e) {
            log.error("深度图生成失败", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        }
    }
}
