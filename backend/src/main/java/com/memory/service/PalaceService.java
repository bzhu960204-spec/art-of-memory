package com.memory.service;

import com.memory.common.BusinessException;
import com.memory.entity.PalaceImage;
import com.memory.repository.PalaceImageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Stores memory-palace images on disk and their metadata in the database. */
@Service
public class PalaceService {

    static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

    public record StoredImage(Resource resource, String contentType) {
    }

    private final PalaceImageRepository repository;
    private final Path uploadDir;

    public PalaceService(PalaceImageRepository repository,
                         @Value("${app.palace-upload-dir:./data/palaces}") String uploadPath) {
        this.repository = repository;
        this.uploadDir = Paths.get(uploadPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create palace upload directory", e);
        }
    }

    @Transactional(readOnly = true)
    public List<PalaceImage> list() {
        return repository.findAllByOrderByCreatedTimeAsc();
    }

    @Transactional
    public PalaceImage upload(MultipartFile file, String title) throws IOException {
        if (file.isEmpty()) {
            throw BusinessException.badRequest("文件不能为空");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw BusinessException.badRequest("文件大小不能超过 10MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw BusinessException.badRequest("只能上传图片文件");
        }
        byte[] header = new byte[8];
        try (InputStream is = file.getInputStream()) {
            if (is.read(header) < 4) {
                throw BusinessException.badRequest("文件内容无效");
            }
        }
        if (!isValidImageMagicBytes(header)) {
            throw BusinessException.badRequest("文件内容不是有效的图片格式");
        }

        String originalName = file.getOriginalFilename();
        String ext = originalName != null && originalName.contains(".")
                ? originalName.substring(originalName.lastIndexOf('.'))
                : "";
        // UUID names avoid collisions and path injection via the original file name
        String storedName = UUID.randomUUID() + ext;
        Path target = resolveInUploadDir(storedName);
        file.transferTo(target);

        PalaceImage image = new PalaceImage();
        image.setTitle(title != null && !title.isBlank() ? title.trim() : (originalName != null ? originalName : "未命名"));
        image.setFileName(storedName);
        image.setOriginalName(originalName != null ? originalName : "unknown");
        image.setContentType(contentType);
        image.setFileSize(file.getSize());
        image.setCreatedTime(LocalDateTime.now());
        return repository.save(image);
    }

    public StoredImage load(String fileName) throws IOException {
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw BusinessException.badRequest("非法文件名");
        }
        Path path = resolveInUploadDir(fileName);
        if (!Files.exists(path)) {
            throw BusinessException.notFound("图片不存在");
        }
        String contentType = Files.probeContentType(path);
        return new StoredImage(new UrlResource(path.toUri()), contentType != null ? contentType : "application/octet-stream");
    }

    @Transactional
    public void delete(Long id) throws IOException {
        PalaceImage image = repository.findById(id).orElseThrow(() -> BusinessException.notFound("图片不存在"));
        Files.deleteIfExists(resolveInUploadDir(image.getFileName()));
        repository.delete(image);
    }

    private Path resolveInUploadDir(String fileName) {
        Path path = uploadDir.resolve(fileName).normalize();
        if (!path.startsWith(uploadDir)) {
            throw BusinessException.badRequest("非法文件路径");
        }
        return path;
    }

    /**
     * Checks magic bytes of common image formats:
     * JPEG FF D8 FF, PNG 89 50 4E 47, GIF 47 49 46 38, BMP 42 4D, WEBP 52 49 46 46 (RIFF).
     */
    private static boolean isValidImageMagicBytes(byte[] h) {
        if ((h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return true;
        if ((h[0] & 0xFF) == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47) return true;
        if (h[0] == 0x47 && h[1] == 0x49 && h[2] == 0x46 && h[3] == 0x38) return true;
        if (h[0] == 0x42 && h[1] == 0x4D) return true;
        return h[0] == 0x52 && h[1] == 0x49 && h[2] == 0x46 && h[3] == 0x46;
    }
}
