package com.memory;

import com.memory.repository.ObjectCodeRepository;
import com.memory.repository.PaoCodeRepository;
import com.memory.repository.WordRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class SeedDataTest {

    @Autowired
    private PaoCodeRepository paoCodeRepository;
    @Autowired
    private ObjectCodeRepository objectCodeRepository;
    @Autowired
    private WordRepository wordRepository;

    @Test
    void seedsDefaultDataIntoEmptyDatabase() {
        assertThat(paoCodeRepository.count()).isEqualTo(100);
        assertThat(objectCodeRepository.count()).isEqualTo(100);
        assertThat(wordRepository.count()).isEqualTo(60);
    }

    @Test
    void seedDataKeepsChineseCharactersIntact() {
        assertThat(objectCodeRepository.findByNumberString("00"))
                .hasValueSatisfying(code -> assertThat(code.getObjectName()).isEqualTo("铃铛"));
    }
}
