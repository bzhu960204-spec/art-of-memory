package com.memory.controller;

import com.memory.common.Result;
import com.memory.entity.PalaceImage;
import com.memory.service.PalaceService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/palaces")
public class PalaceController {

    private final PalaceService palaceService;

    public PalaceController(PalaceService palaceService) {
        this.palaceService = palaceService;
    }

    @GetMapping("/list")
    public Result<List<PalaceImage>> list() {
        return Result.success(palaceService.list());
    }

    @PostMapping("/upload")
    public Result<PalaceImage> upload(@RequestParam("file") MultipartFile file,
                                      @RequestParam(value = "title", required = false) String title) throws IOException {
        return Result.success(palaceService.upload(file, title));
    }

    @GetMapping("/image/{fileName}")
    public ResponseEntity<Resource> getImage(@PathVariable String fileName) throws IOException {
        PalaceService.StoredImage image = palaceService.load(fileName);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .header(HttpHeaders.CACHE_CONTROL, "max-age=86400")
                .body(image.resource());
    }

    @DeleteMapping("/{id}")
    public Result<String> delete(@PathVariable Long id) throws IOException {
        palaceService.delete(id);
        return Result.success("已删除");
    }
}
