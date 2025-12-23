package com.immersa.repository;

import com.immersa.model.UploadSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UploadSessionRepository extends JpaRepository<UploadSession, UUID> {

    /**
     * 根据文件哈希查找已存在的会话（用于去重）
     */
    Optional<UploadSession> findByFileHashAndStatus(String fileHash, UploadSession.UploadStatus status);

    /**
     * 查找过期的会话（用于清理）
     */
    List<UploadSession> findByExpiresAtBeforeAndStatusNot(LocalDateTime time, UploadSession.UploadStatus status);

    /**
     * 根据状态查找会话
     */
    List<UploadSession> findByStatus(UploadSession.UploadStatus status);
}
