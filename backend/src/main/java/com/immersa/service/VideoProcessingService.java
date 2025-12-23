package com.immersa.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * 视频处理服务
 * 使用 FFmpeg 进行视频转码、抽帧等操作
 */
@Service
@Slf4j
public class VideoProcessingService {

    @Value("${ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    @Value("${storage.local.location:./data/assets}")
    private String storageLocation;

    @Value("${video.frames.location:./data/frames}")
    private String framesLocation;

    /**
     * 从视频中抽取帧
     * 
     * @param videoPath 视频文件路径
     * @param fps       每秒抽取帧数（0 表示只抽关键帧）
     * @return 抽取的帧文件列表
     */
    public List<String> extractFrames(String videoPath, double fps) {
        String sessionId = UUID.randomUUID().toString();
        Path outputDir = Paths.get(framesLocation, sessionId);

        try {
            Files.createDirectories(outputDir);
        } catch (IOException e) {
            throw new RuntimeException("创建帧输出目录失败", e);
        }

        List<String> command = new ArrayList<>();
        command.add(ffmpegPath);
        command.add("-i");
        command.add(videoPath);

        if (fps > 0) {
            // 固定 FPS 抽帧
            command.add("-vf");
            command.add("fps=" + fps);
        } else {
            // 只抽关键帧 (I-frames)
            command.add("-vf");
            command.add("select='eq(pict_type,I)'");
            command.add("-vsync");
            command.add("vfr");
        }

        command.add("-q:v");
        command.add("2"); // 高质量
        command.add(outputDir.resolve("frame_%05d.jpg").toString());

        try {
            executeFFmpeg(command);
        } catch (Exception e) {
            throw new RuntimeException("视频抽帧失败", e);
        }

        // 返回生成的帧文件列表
        List<String> frames = new ArrayList<>();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(outputDir, "*.jpg")) {
            for (Path entry : stream) {
                frames.add(entry.toString());
            }
        } catch (IOException e) {
            log.error("读取帧文件列表失败", e);
        }

        frames.sort(String::compareTo);
        log.info("抽取了 {} 帧: {}", frames.size(), outputDir);
        return frames;
    }

    /**
     * 获取视频信息
     */
    public VideoInfo getVideoInfo(String videoPath) {
        List<String> command = new ArrayList<>();
        command.add(ffmpegPath.replace("ffmpeg", "ffprobe"));
        command.add("-v");
        command.add("quiet");
        command.add("-print_format");
        command.add("json");
        command.add("-show_format");
        command.add("-show_streams");
        command.add(videoPath);

        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line);
                }
            }

            process.waitFor(30, TimeUnit.SECONDS);

            // 简单解析 JSON（生产环境建议使用 Jackson）
            String json = output.toString();
            VideoInfo info = new VideoInfo();

            // 提取时长
            if (json.contains("\"duration\"")) {
                int start = json.indexOf("\"duration\"") + 12;
                int end = json.indexOf("\"", start);
                info.duration = Double.parseDouble(json.substring(start, end));
            }

            // 提取分辨率
            if (json.contains("\"width\"")) {
                int start = json.indexOf("\"width\"") + 8;
                int end = json.indexOf(",", start);
                info.width = Integer.parseInt(json.substring(start, end).trim());
            }
            if (json.contains("\"height\"")) {
                int start = json.indexOf("\"height\"") + 9;
                int end = json.indexOf(",", start);
                info.height = Integer.parseInt(json.substring(start, end).trim());
            }

            return info;
        } catch (Exception e) {
            log.error("获取视频信息失败", e);
            return new VideoInfo();
        }
    }

    /**
     * 生成视频缩略图
     */
    public String generateThumbnail(String videoPath) {
        String thumbnailName = UUID.randomUUID() + "_thumb.jpg";
        Path thumbnailPath = Paths.get(storageLocation, "thumbnails", thumbnailName);

        try {
            Files.createDirectories(thumbnailPath.getParent());
        } catch (IOException e) {
            throw new RuntimeException("创建缩略图目录失败", e);
        }

        List<String> command = new ArrayList<>();
        command.add(ffmpegPath);
        command.add("-i");
        command.add(videoPath);
        command.add("-ss");
        command.add("00:00:01"); // 取第 1 秒的帧
        command.add("-vframes");
        command.add("1");
        command.add("-vf");
        command.add("scale=320:-1"); // 宽度 320，高度自适应
        command.add("-q:v");
        command.add("5");
        command.add(thumbnailPath.toString());

        try {
            executeFFmpeg(command);
            return thumbnailPath.toString();
        } catch (Exception e) {
            log.error("生成缩略图失败", e);
            return null;
        }
    }

    /**
     * 执行 FFmpeg 命令
     */
    private void executeFFmpeg(List<String> command) throws IOException, InterruptedException {
        log.debug("执行 FFmpeg: {}", String.join(" ", command));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        // 读取输出（避免缓冲区满导致阻塞）
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                log.trace("FFmpeg: {}", line);
            }
        }

        boolean completed = process.waitFor(5, TimeUnit.MINUTES);
        if (!completed) {
            process.destroyForcibly();
            throw new RuntimeException("FFmpeg 执行超时");
        }

        if (process.exitValue() != 0) {
            throw new RuntimeException("FFmpeg 执行失败，退出码: " + process.exitValue());
        }
    }

    /**
     * 视频信息
     */
    public static class VideoInfo {
        public double duration;
        public int width;
        public int height;
        public double fps;
    }
}
