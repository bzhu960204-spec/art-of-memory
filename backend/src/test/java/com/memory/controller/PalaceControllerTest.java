package com.memory.controller;

import com.memory.repository.PalaceImageRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.endsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PalaceControllerTest {

    private static final byte[] PNG_HEADER = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0};

    @Autowired
    private MockMvc mvc;
    @Autowired
    private PalaceImageRepository repository;

    @AfterEach
    void cleanUp() throws Exception {
        for (var image : repository.findAll()) {
            mvc.perform(delete("/api/palaces/" + image.getId()));
        }
    }

    @Test
    void acceptsValidPngAndServesItBack() throws Exception {
        var file = new MockMultipartFile("file", "room.png", "image/png", PNG_HEADER);

        mvc.perform(multipart("/api/palaces/upload").file(file).param("title", " 客厅 "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.title").value("客厅"))
                .andExpect(jsonPath("$.data.fileName", endsWith(".png")));

        String storedName = repository.findAll().get(0).getFileName();
        mvc.perform(get("/api/palaces/image/" + storedName)).andExpect(status().isOk());
    }

    @Test
    void rejectsNonImageContentType() throws Exception {
        var file = new MockMultipartFile("file", "notes.txt", "text/plain", "hello".getBytes());

        mvc.perform(multipart("/api/palaces/upload").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.msg").value("只能上传图片文件"));
    }

    @Test
    void rejectsImageContentTypeWithInvalidMagicBytes() throws Exception {
        var file = new MockMultipartFile("file", "fake.png", "image/png", "not really a png".getBytes());

        mvc.perform(multipart("/api/palaces/upload").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void deletingUnknownImageIsNotFound() throws Exception {
        mvc.perform(delete("/api/palaces/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    void rejectsPathTraversalWhenReadingImages() throws Exception {
        mvc.perform(get("/api/palaces/image/..secret.jpg")).andExpect(status().isBadRequest());
    }

    @Test
    void returnsNotFoundForMissingImage() throws Exception {
        mvc.perform(get("/api/palaces/image/missing.jpg")).andExpect(status().isNotFound());
    }
}
