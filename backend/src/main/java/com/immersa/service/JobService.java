package com.immersa.service;

import com.immersa.model.Asset;
import com.immersa.model.Job;
import com.immersa.model.JobStatus;
import com.immersa.model.JobType;
import com.immersa.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobService {

    private final JobRepository jobRepository;
    private final AiService aiService;

    public Job createJob(Asset asset, JobType type) {
        Job job = new Job();
        job.setAsset(asset);
        job.setType(type);
        job.setStatus(JobStatus.PENDING);
        return jobRepository.save(job);
    }

    public void startJob(Job job) {
        job.setStatus(JobStatus.RUNNING);
        jobRepository.save(job);

        try {
            if (job.getType() == JobType.DEPTH_ESTIMATION) {
                log.info("Triggering AI service for Job {}", job.getId());

                // 调用 AI 服务生成深度图
                String resultUrl = aiService.generateDepth(job.getAsset());

                job.setResult("{\"depthUrl\": \"" + resultUrl + "\"}");
                job.setStatus(JobStatus.COMPLETED);
                job.setCompletedAt(java.time.LocalDateTime.now());
                jobRepository.save(job);
            }
        } catch (Exception e) {
            log.error("Job {} failed: {}", job.getId(), e.getMessage());
            job.setStatus(JobStatus.FAILED);
            jobRepository.save(job);
        }
    }
}
