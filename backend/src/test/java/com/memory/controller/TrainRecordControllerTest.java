package com.memory.controller;

import com.memory.entity.TrainRecord;
import com.memory.repository.TrainRecordRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TrainRecordControllerTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private TrainRecordRepository repository;

    @Test
    void savesValidRecord() throws Exception {
        mvc.perform(post("/api/records/save").contentType(MediaType.APPLICATION_JSON).content("""
                        {"moduleType":"WORDS","durationSeconds":30,"accuracyRate":0.8,"avgResponseMs":null,"totalItems":20}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.moduleType").value("WORDS"));
    }

    @Test
    void cannotOverwriteAnExistingRecordBySendingItsId() throws Exception {
        TrainRecord existing = new TrainRecord();
        existing.setModuleType("PAO");
        existing.setDurationSeconds(10);
        existing.setAccuracyRate(0.5);
        existing.setTotalItems(5);
        existing = repository.save(existing);

        mvc.perform(post("/api/records/save").contentType(MediaType.APPLICATION_JSON).content("""
                        {"id":%d,"moduleType":"WORDS","durationSeconds":99,"accuracyRate":1.0,"totalItems":99}
                        """.formatted(existing.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", not(existing.getId().intValue())));

        TrainRecord reloaded = repository.findById(existing.getId()).orElseThrow();
        assertThat(reloaded.getModuleType()).isEqualTo("PAO");
        assertThat(reloaded.getDurationSeconds()).isEqualTo(10);
    }

    @Test
    void rejectsUnknownModuleType() throws Exception {
        mvc.perform(post("/api/records/save").contentType(MediaType.APPLICATION_JSON).content("""
                        {"moduleType":"HACK","durationSeconds":1,"accuracyRate":1,"totalItems":1}
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMissingOrNegativeFields() throws Exception {
        mvc.perform(post("/api/records/save").contentType(MediaType.APPLICATION_JSON).content("""
                        {"moduleType":"PAO","durationSeconds":-1,"accuracyRate":0.5}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.msg").exists());
    }

    @Test
    void unknownEndpointsReturn404AndSubmitEndpointWasRemoved() throws Exception {
        mvc.perform(post("/api/challenge/daily/submit").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/does-not-exist")).andExpect(status().isNotFound());
    }

    @Test
    void streakEndpointReturnsView() throws Exception {
        mvc.perform(get("/api/challenge/streak"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentStreak").exists())
                .andExpect(jsonPath("$.data.longestStreak").exists());
    }

    @Test
    void achievementsEndpointKeepsResponseShape() throws Exception {
        mvc.perform(get("/api/challenge/achievements"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.data[0].key").value("streak_7"))
                .andExpect(jsonPath("$.data[0].target").value(7))
                .andExpect(jsonPath("$.data[0].unlocked").isBoolean());
    }
}
