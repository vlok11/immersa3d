package com.immersa.controller;

import com.immersa.model.Asset;
import com.immersa.repository.AssetRepository;
import com.immersa.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {

    private final StorageService storageService;
    private final AssetRepository assetRepository;
    private final com.immersa.service.JobService jobService;

    @PostMapping("/upload")
    public ResponseEntity<Asset> uploadAsset(@RequestParam("file") MultipartFile file) {
        try {
            Asset asset = storageService.uploadFile(file);

            // Auto-trigger depth estimation for images
            if (asset.getType() == com.immersa.model.AssetType.IMAGE) {
                var job = jobService.createJob(asset, com.immersa.model.JobType.DEPTH_ESTIMATION);
                // TODO: 生产环境应改为异步消息队列触发
                jobService.startJob(job);
            }

            return ResponseEntity.ok(asset);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Asset> getAsset(@PathVariable UUID id) {
        return assetRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 获取资源的访问 URL
     */
    @GetMapping("/{id}/url")
    public ResponseEntity<Map<String, String>> getAssetUrl(@PathVariable UUID id) {
        return assetRepository.findById(id)
                .map(asset -> ResponseEntity.ok(Map.of("url", "/api/assets/file/" + asset.getStoragePath())))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 直接返回文件流，用于图片预览
     */
    @GetMapping("/file/{objectName}")
    public ResponseEntity<InputStreamResource> getFile(@PathVariable String objectName) {
        try {
            InputStream stream = storageService.getFile(objectName);
            // 根据文件扩展名确定 Content-Type
            MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
            if (objectName.endsWith(".jpg") || objectName.endsWith(".jpeg")) {
                mediaType = MediaType.IMAGE_JPEG;
            } else if (objectName.endsWith(".png")) {
                mediaType = MediaType.IMAGE_PNG;
            } else if (objectName.endsWith(".gif")) {
                mediaType = MediaType.IMAGE_GIF;
            } else if (objectName.endsWith(".webp")) {
                mediaType = MediaType.parseMediaType("image/webp");
            }
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .body(new InputStreamResource(stream));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
