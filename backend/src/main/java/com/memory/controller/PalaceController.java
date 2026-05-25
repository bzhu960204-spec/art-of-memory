package com.memory.controller;

import com.memory.common.Result;
import com.memory.entity.PalaceImage;
import com.memory.repository.PalaceImageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/palaces")
public class PalaceController {

    private final PalaceImageRepository repository;
    private final Path uploadDir;

    public PalaceController(PalaceImageRepository repository,
                            @Value("${app.palace-upload-dir:./data/palaces}") String uploadPath) {
        this.repository = repository;
        this.uploadDir = Paths.get(uploadPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create palace upload directory", e);
        }
    }

    @GetMapping("/list")
    public Result<List<PalaceImage>> list() {
        return Result.success(repository.findAllByOrderByCreatedTimeAsc());
    }

    @PostMapping("/upload")
    public Result<PalaceImage> upload(@RequestParam("file") MultipartFile file,
                                      @RequestParam(value = "title", required = false) String title) throws IOException {
        if (file.isEmpty()) {
            return Result.error("文件不能为空");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return Result.error("只能上传图片文件");
        }

        // 限制文件大小 10MB
        if (file.getSize() > 10 * 1024 * 1024) {
            return Result.error("文件大小不能超过 10MB");
        }

        String originalName = file.getOriginalFilename();
        String ext = "";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf("."));
        }

        // 使用 UUID 防止文件名冲突和路径注入
        String storedName = UUID.randomUUID() + ext;
        Path targetPath = uploadDir.resolve(storedName).normalize();

        // 安全检查：确保目标路径在上传目录内
        if (!targetPath.startsWith(uploadDir)) {
            return Result.error("非法文件路径");
        }

        file.transferTo(targetPath);

        PalaceImage image = new PalaceImage();
        image.setTitle(title != null && !title.isBlank() ? title.trim() : (originalName != null ? originalName : "未命名"));
        image.setFileName(storedName);
        image.setOriginalName(originalName != null ? originalName : "unknown");
        image.setContentType(contentType);
        image.setFileSize(file.getSize());
        image.setCreatedTime(LocalDateTime.now());

        repository.save(image);
        return Result.success(image);
    }

    @GetMapping("/image/{fileName}")
    public ResponseEntity<Resource> getImage(@PathVariable String fileName) throws IOException {
        // 安全检查：不允许路径遍历
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            return ResponseEntity.badRequest().build();
        }

        Path filePath = uploadDir.resolve(fileName).normalize();
        if (!filePath.startsWith(uploadDir) || !Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(filePath.toUri());
        String contentType = Files.probeContentType(filePath);
        if (contentType == null) contentType = "application/octet-stream";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CACHE_CONTROL, "max-age=86400")
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public Result<String> delete(@PathVariable Long id) throws IOException {
        PalaceImage image = repository.findById(id).orElse(null);
        if (image == null) return Result.error("图片不存在");

        Path filePath = uploadDir.resolve(image.getFileName()).normalize();
        if (filePath.startsWith(uploadDir)) {
            Files.deleteIfExists(filePath);
        }
        repository.delete(image);
        return Result.success("已删除");
    }
}
