package com.immersa.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 分块上传会话实体
 * 跟踪大文件分块上传的状态
 */
@Data
@Entity
@Table(name = "upload_sessions")
public class UploadSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String filename;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "chunk_size", nullable = false)
    private Integer chunkSize;

    @Column(name = "total_chunks", nullable = false)
    private Integer totalChunks;

    @Column(name = "uploaded_chunks", nullable = false)
    private Integer uploadedChunks = 0;

    @Column(name = "file_hash")
    private String fileHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UploadStatus status = UploadStatus.PENDING;

    @Column(name = "temp_path")
    private String tempPath;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    public enum UploadStatus {
        PENDING,
        UPLOADING,
        COMPLETED,
        FAILED,
        EXPIRED
    }
}
