package com.immersa.service;

import com.immersa.model.Asset;
import com.immersa.model.AssetType;
import com.immersa.model.UploadSession;
import com.immersa.repository.AssetRepository;
import com.immersa.repository.UploadSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 分块上传服务
 * 支持大文件分块上传、断点续传、哈希去重
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChunkUploadService {

    private final UploadSessionRepository sessionRepository;
    private final AssetRepository assetRepository;

    @Value("${storage.local.location:./data/assets}")
    private String storageLocation;

    @Value("${upload.temp.location:./data/temp}")
    private String tempLocation;

    @Value("${upload.session.expiry.hours:24}")
    private int sessionExpiryHours;

    /**
     * 初始化上传会话
     */
    public UploadSession initUpload(String filename, Long fileSize, String mimeType,
            Integer chunkSize, String fileHash) {
        // 检查是否存在相同哈希的已完成上传（秒传）
        if (fileHash != null) {
            var existing = sessionRepository.findByFileHashAndStatus(
                    fileHash, UploadSession.UploadStatus.COMPLETED);
            if (existing.isPresent()) {
                log.info("文件哈希匹配，执行秒传: {}", fileHash);
                return existing.get();
            }
        }

        // 计算分块数量
        int totalChunks = (int) Math.ceil((double) fileSize / chunkSize);

        // 创建临时目录
        String sessionId = UUID.randomUUID().toString();
        Path tempDir = Paths.get(tempLocation, sessionId);
        try {
            Files.createDirectories(tempDir);
        } catch (IOException e) {
            throw new RuntimeException("创建临时目录失败", e);
        }

        // 创建会话
        UploadSession session = new UploadSession();
        session.setFilename(filename);
        session.setFileSize(fileSize);
        session.setMimeType(mimeType);
        session.setChunkSize(chunkSize);
        session.setTotalChunks(totalChunks);
        session.setFileHash(fileHash);
        session.setTempPath(tempDir.toString());
        session.setStatus(UploadSession.UploadStatus.UPLOADING);
        session.setExpiresAt(LocalDateTime.now().plusHours(sessionExpiryHours));

        return sessionRepository.save(session);
    }

    /**
     * 上传分块
     */
    public UploadSession uploadChunk(UUID sessionId, int chunkIndex, MultipartFile chunk) {
        UploadSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("上传会话不存在: " + sessionId));

        if (session.getStatus() != UploadSession.UploadStatus.UPLOADING) {
            throw new RuntimeException("会话状态无效: " + session.getStatus());
        }

        if (chunkIndex < 0 || chunkIndex >= session.getTotalChunks()) {
            throw new RuntimeException("无效的分块索引: " + chunkIndex);
        }

        // 保存分块到临时目录
        Path chunkPath = Paths.get(session.getTempPath(), String.format("chunk_%05d", chunkIndex));
        try {
            Files.copy(chunk.getInputStream(), chunkPath, StandardCopyOption.REPLACE_EXISTING);
            log.debug("分块 {} 上传成功: {}", chunkIndex, chunkPath);
        } catch (IOException e) {
            throw new RuntimeException("保存分块失败", e);
        }

        // 更新已上传数量 (加锁防止并发覆盖)
        synchronized (this) {
            UploadSession freshSession = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("上传会话不存在: " + sessionId));
            freshSession.setUploadedChunks(freshSession.getUploadedChunks() + 1);
            return sessionRepository.save(freshSession);
        }
    }

    /**
     * 完成上传 - 合并分块
     */
    public Asset completeUpload(UUID sessionId) {
        UploadSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("上传会话不存在: " + sessionId));

        if (session.getUploadedChunks() < session.getTotalChunks()) {
            throw new RuntimeException("分块未上传完成: " +
                    session.getUploadedChunks() + "/" + session.getTotalChunks());
        }

        // 确定文件扩展名
        String extension = "";
        String filename = session.getFilename();
        if (filename != null && filename.contains(".")) {
            extension = filename.substring(filename.lastIndexOf("."));
        }

        // 生成最终文件名
        String finalFilename = UUID.randomUUID() + extension;
        Path finalPath = Paths.get(storageLocation, finalFilename);

        try {
            // 确保目标目录存在
            Files.createDirectories(finalPath.getParent());

            // 合并分块
            try (OutputStream out = new BufferedOutputStream(Files.newOutputStream(finalPath))) {
                for (int i = 0; i < session.getTotalChunks(); i++) {
                    Path chunkPath = Paths.get(session.getTempPath(), String.format("chunk_%05d", i));
                    if (!Files.exists(chunkPath)) {
                        throw new RuntimeException("分块文件丢失: " + i);
                    }
                    Files.copy(chunkPath, out);
                }
            }

            log.info("文件合并完成: {}", finalPath);

            // 清理临时文件
            cleanupTempFiles(session.getTempPath());

            // 更新会话状态
            session.setStatus(UploadSession.UploadStatus.COMPLETED);
            session.setCompletedAt(LocalDateTime.now());
            sessionRepository.save(session);

            // 创建 Asset 记录
            AssetType type = determineAssetType(session.getMimeType());
            Asset asset = new Asset();
            asset.setOriginalFilename(session.getFilename());
            asset.setStoragePath(finalFilename);
            asset.setFileSize(session.getFileSize());
            asset.setMimeType(session.getMimeType());
            asset.setType(type);

            return assetRepository.save(asset);

        } catch (IOException e) {
            session.setStatus(UploadSession.UploadStatus.FAILED);
            sessionRepository.save(session);
            throw new RuntimeException("合并分块失败", e);
        }
    }

    /**
     * 获取上传进度
     */
    public UploadSession getProgress(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("上传会话不存在: " + sessionId));
    }

    /**
     * 清理临时文件
     */
    private void cleanupTempFiles(String tempPath) {
        try {
            Path dir = Paths.get(tempPath);
            if (Files.exists(dir)) {
                Files.walk(dir)
                        .sorted((a, b) -> b.compareTo(a)) // 反向排序，先删文件再删目录
                        .forEach(path -> {
                            try {
                                Files.delete(path);
                            } catch (IOException e) {
                                log.warn("清理临时文件失败: {}", path);
                            }
                        });
            }
        } catch (IOException e) {
            log.error("清理临时目录失败: {}", tempPath, e);
        }
    }

    /**
     * 根据 MIME 类型确定资源类型
     */
    private AssetType determineAssetType(String mimeType) {
        if (mimeType == null)
            return AssetType.IMAGE;
        if (mimeType.startsWith("video/"))
            return AssetType.VIDEO;
        return AssetType.IMAGE;
    }
}
