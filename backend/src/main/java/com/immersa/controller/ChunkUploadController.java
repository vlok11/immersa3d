package com.immersa.controller;

import com.immersa.model.Asset;
import com.immersa.model.UploadSession;
import com.immersa.service.ChunkUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

/**
 * 分块上传控制器
 * 提供大文件分块上传 API
 */
@RestController
@RequestMapping("/api/assets/upload")
@RequiredArgsConstructor
@Slf4j
public class ChunkUploadController {

    private final ChunkUploadService uploadService;

    /**
     * 初始化上传会话
     * POST /api/assets/upload/init
     */
    @PostMapping("/init")
    public ResponseEntity<Map<String, Object>> initUpload(@RequestBody Map<String, Object> payload) {
        try {
            String filename = (String) payload.get("filename");
            Long fileSize = ((Number) payload.get("fileSize")).longValue();
            String mimeType = (String) payload.get("mimeType");
            Integer chunkSize = ((Number) payload.getOrDefault("chunkSize", 5 * 1024 * 1024)).intValue(); // 默认 5MB
            String fileHash = (String) payload.get("fileHash");

            UploadSession session = uploadService.initUpload(filename, fileSize, mimeType, chunkSize, fileHash);

            // 如果是秒传，直接返回完成状态
            if (session.getStatus() == UploadSession.UploadStatus.COMPLETED) {
                return ResponseEntity.ok(Map.of(
                        "sessionId", session.getId(),
                        "status", "completed",
                        "message", "文件已存在，秒传成功"));
            }

            return ResponseEntity.ok(Map.of(
                    "sessionId", session.getId(),
                    "totalChunks", session.getTotalChunks(),
                    "chunkSize", session.getChunkSize(),
                    "status", "uploading"));
        } catch (Exception e) {
            log.error("初始化上传失败", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "上传初始化失败，请稍后重试"));
        }
    }

    /**
     * 上传分块
     * POST /api/assets/upload/chunk
     */
    @PostMapping("/chunk")
    public ResponseEntity<Map<String, Object>> uploadChunk(
            @RequestParam("sessionId") UUID sessionId,
            @RequestParam("chunkIndex") int chunkIndex,
            @RequestParam("chunk") MultipartFile chunk) {
        try {
            UploadSession session = uploadService.uploadChunk(sessionId, chunkIndex, chunk);

            return ResponseEntity.ok(Map.of(
                    "sessionId", session.getId(),
                    "chunkIndex", chunkIndex,
                    "uploadedChunks", session.getUploadedChunks(),
                    "totalChunks", session.getTotalChunks(),
                    "progress", (double) session.getUploadedChunks() / session.getTotalChunks() * 100));
        } catch (Exception e) {
            log.error("上传分块失败", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "分块上传失败，请稍后重试"));
        }
    }

    /**
     * 完成上传
     * POST /api/assets/upload/complete
     */
    @PostMapping("/complete")
    public ResponseEntity<Map<String, Object>> completeUpload(@RequestBody Map<String, Object> payload) {
        try {
            UUID sessionId = UUID.fromString((String) payload.get("sessionId"));
            Asset asset = uploadService.completeUpload(sessionId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "asset", Map.of(
                            "id", asset.getId(),
                            "filename", asset.getOriginalFilename(),
                            "storagePath", asset.getStoragePath(),
                            "fileSize", asset.getFileSize(),
                            "mimeType", asset.getMimeType(),
                            "type", asset.getType())));
        } catch (Exception e) {
            log.error("完成上传失败", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "文件合并失败，请稍后重试"));
        }
    }

    /**
     * 获取上传进度
     * GET /api/assets/upload/progress/{sessionId}
     */
    @GetMapping("/progress/{sessionId}")
    public ResponseEntity<Map<String, Object>> getProgress(@PathVariable UUID sessionId) {
        try {
            UploadSession session = uploadService.getProgress(sessionId);

            return ResponseEntity.ok(Map.of(
                    "sessionId", session.getId(),
                    "status", session.getStatus(),
                    "uploadedChunks", session.getUploadedChunks(),
                    "totalChunks", session.getTotalChunks(),
                    "progress", (double) session.getUploadedChunks() / session.getTotalChunks() * 100));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
