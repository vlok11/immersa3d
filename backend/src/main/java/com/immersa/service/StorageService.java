package com.immersa.service;

import com.immersa.model.Asset;
import com.immersa.model.AssetType;
import com.immersa.repository.AssetRepository;
import io.minio.*;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

@Service
@Slf4j
public class StorageService {

    // MinioClient 仅在 storage.type=minio 时注入
    @Autowired(required = false)
    private MinioClient minioClient;

    private final AssetRepository assetRepository;

    public StorageService(AssetRepository assetRepository) {
        this.assetRepository = assetRepository;
    }

    @Value("${minio.bucket:immersa-assets}")
    private String bucketName;

    @Value("${storage.type:local}")
    private String storageType;

    @Value("${storage.local.location:./data/assets}")
    private String localLocation;

    @PostConstruct
    public void init() {
        try {
            if ("minio".equalsIgnoreCase(storageType)) {
                boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
                if (!found) {
                    minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                    log.info("Created MinIO bucket: {}", bucketName);
                }
            } else {
                java.nio.file.Files.createDirectories(java.nio.file.Paths.get(localLocation));
                log.info("Initialized local storage at: {}", localLocation);
            }
        } catch (Exception e) {
            log.error("Could not initialize storage", e);
        }
    }

    public Asset uploadFile(MultipartFile file) throws Exception {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        String objectName = UUID.randomUUID().toString() + extension;

        // Determine asset type based on mime type (simplified)
        AssetType type = AssetType.IMAGE;
        if (file.getContentType() != null && file.getContentType().startsWith("video")) {
            type = AssetType.VIDEO;
        }

        if ("minio".equalsIgnoreCase(storageType)) {
            try (InputStream inputStream = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucketName)
                                .object(objectName)
                                .stream(inputStream, file.getSize(), -1)
                                .contentType(file.getContentType())
                                .build());
            }
        } else {
            java.nio.file.Path destination = java.nio.file.Paths.get(localLocation).resolve(objectName);
            file.transferTo(destination.toFile());
        }

        Asset asset = new Asset();
        asset.setOriginalFilename(originalFilename);
        asset.setStoragePath(objectName);
        asset.setFileSize(file.getSize());
        asset.setMimeType(file.getContentType());
        asset.setType(type);

        return assetRepository.save(asset);
    }

    public InputStream getFile(String objectName) throws Exception {
        if ("minio".equalsIgnoreCase(storageType)) {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build());
        } else {
            java.nio.file.Path source = java.nio.file.Paths.get(localLocation).resolve(objectName);
            return java.nio.file.Files.newInputStream(source);
        }
    }
}
