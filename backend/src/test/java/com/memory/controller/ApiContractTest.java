package com.memory.controller;

import com.memory.entity.TrainRecord;
import com.memory.entity.WrongItem;
import com.memory.repository.TrainRecordRepository;
import com.memory.repository.WrongItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Response shapes, aggregation and request validation of the analytics / pao / object / word endpoints. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ApiContractTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private TrainRecordRepository recordRepository;
    @Autowired
    private WrongItemRepository wrongItemRepository;

    @BeforeEach
    void seed() {
        recordRepository.deleteAll();
        wrongItemRepository.deleteAll();
        record("PAO", 0.5, 1500, 20);
        record("PAO", 0.9, 1200, 20);
        record("PAO", 0.7, null, 10);
        record("WORDS", 1.0, null, 50);
        for (int i = 0; i < 15; i++) wrong("PAO", String.format("%02d", i), i + 1);
        wrong("OBJECT", "99", 100);
    }

    // ---- analytics ----

    @Test
    void bestsAreAggregatedPerModule() throws Exception {
        mvc.perform(get("/api/analytics/bests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.PAO.bestAccuracy").value(0.9))
                .andExpect(jsonPath("$.data.PAO.bestResponseMs").value(1200))
                .andExpect(jsonPath("$.data.PAO.totalSessions").value(3))
                .andExpect(jsonPath("$.data.PAO.totalItems").value(50))
                .andExpect(jsonPath("$.data.WORDS.bestResponseMs").value(0));
    }

    @Test
    void summaryKeepsResponseShape() throws Exception {
        mvc.perform(get("/api/analytics/summary?days=7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSessions").value(4))
                .andExpect(jsonPath("$.data.modules.length()").value(2))
                .andExpect(jsonPath("$.data.heatmap.*").value(org.hamcrest.Matchers.hasItem(4)));
    }

    @Test
    void trendGroupsByDay() throws Exception {
        mvc.perform(get("/api/analytics/trend?days=7&module=PAO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].sessions").value(3))
                .andExpect(jsonPath("$.data[0].avgAccuracy", closeTo(0.7, 0.0001)))
                .andExpect(jsonPath("$.data[0].avgResponseMs").value(1350.0))
                .andExpect(jsonPath("$.data[0].totalItems").value(50));
    }

    @Test
    void weakestIsLimitedAndSortedByErrorCount() throws Exception {
        mvc.perform(get("/api/analytics/weakest?limit=3"))
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[0].itemContent").value("99"))
                .andExpect(jsonPath("$.data[1].errorCount").value(15));
        mvc.perform(get("/api/analytics/weakest?limit=5&module=PAO"))
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.data[0].itemContent").value("14"));
    }

    @Test
    void outOfRangeQueryParametersAreRejected() throws Exception {
        mvc.perform(get("/api/analytics/summary?days=0")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
        mvc.perform(get("/api/analytics/trend?days=366")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/analytics/weakest?limit=1000")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/analytics/summary?days=abc")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/pao/random?limit=0")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/words/random?limit=101")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/records/list?limit=500")).andExpect(status().isBadRequest());
    }

    // ---- records ----

    @Test
    void recordListIsLimitedAndNewestFirst() throws Exception {
        mvc.perform(get("/api/records/list?limit=2"))
                .andExpect(jsonPath("$.data.length()").value(2));
        mvc.perform(get("/api/records/list?module=PAO"))
                .andExpect(jsonPath("$.data.length()").value(3));
    }

    // ---- reviews / objects ----

    @Test
    void paoReviewRecordsFailuresAndValidatesItems() throws Exception {
        mvc.perform(post("/api/pao/review").contentType(MediaType.APPLICATION_JSON).content("""
                        [{"numberString":"42","rating":3,"responseMs":900},{"numberString":"43","rating":1,"responseMs":500}]
                        """))
                .andExpect(status().isOk());
        mvc.perform(get("/api/analytics/weakest?module=PAO&limit=100"))
                .andExpect(jsonPath("$.data[?(@.itemContent=='42')].errorCount").value(org.hamcrest.Matchers.hasItem(1)))
                .andExpect(jsonPath("$.data[?(@.itemContent=='43')]").isEmpty());

        mvc.perform(post("/api/pao/review").contentType(MediaType.APPLICATION_JSON).content("""
                        [{"numberString":"42","rating":7,"responseMs":900}]
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void objectEndpointsValidateInput() throws Exception {
        mvc.perform(put("/api/objects/abc").contentType(MediaType.APPLICATION_JSON).content("{\"objectName\":\"x\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/objects/00").contentType(MediaType.APPLICATION_JSON).content("{\"objectName\":\"\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/objects/weights").contentType(MediaType.APPLICATION_JSON).content("""
                        [{"numberString":"1","delta":1}]
                        """))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/objects/00").contentType(MediaType.APPLICATION_JSON).content("{\"objectName\":\"铃铛\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.objectName").value("铃铛"));
    }

    @Test
    void errorResponsesDoNotLeakInternalDetails() throws Exception {
        mvc.perform(post("/api/records/save").contentType(MediaType.APPLICATION_JSON).content("not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.msg").value("请求格式不正确"))
                .andExpect(jsonPath("$.msg", not(containsString("Exception"))));
    }

    // ---- srs & backup ----

    @Test
    void srsEndpointsValidateModule() throws Exception {
        mvc.perform(get("/api/srs/stats?module=PAO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.due").isNumber())
                .andExpect(jsonPath("$.data.learned").isNumber());
        mvc.perform(get("/api/srs/due?module=NOPE")).andExpect(status().isBadRequest());
    }

    @Test
    void paoSessionEndpointReturnsRequestedNumberOfCards() throws Exception {
        mvc.perform(get("/api/pao/session?limit=15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(15));
    }

    @Test
    void backupExportIsADownloadableJsonFileWithAllSections() throws Exception {
        mvc.perform(get("/api/backup/export"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("attachment; filename=\"art-of-memory-backup-")))
                .andExpect(jsonPath("$.formatVersion").value(1))
                .andExpect(jsonPath("$.trainRecords.length()").value(4))
                .andExpect(jsonPath("$.objectCodes.length()").value(100))
                .andExpect(jsonPath("$.paoCodes.length()").value(100))
                .andExpect(jsonPath("$.wrongItems").isArray())
                .andExpect(jsonPath("$.srsCards").isArray())
                .andExpect(jsonPath("$.achievements").isArray())
                .andExpect(jsonPath("$.dailyChallenges").isArray())
                .andExpect(jsonPath("$.palaceImages").isArray());
    }

    private void record(String module, double accuracy, Integer avgMs, int items) {
        TrainRecord r = new TrainRecord();
        r.setModuleType(module);
        r.setAccuracyRate(accuracy);
        r.setAvgResponseMs(avgMs);
        r.setDurationSeconds(60);
        r.setTotalItems(items);
        recordRepository.save(r);
    }

    private void wrong(String module, String item, int count) {
        WrongItem w = new WrongItem();
        w.setModuleType(module);
        w.setItemContent(item);
        w.setErrorCount(count);
        wrongItemRepository.save(w);
    }
}
