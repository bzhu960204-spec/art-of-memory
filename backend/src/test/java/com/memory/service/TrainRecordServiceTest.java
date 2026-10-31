package com.memory.service;

import com.memory.entity.DailyChallenge;
import com.memory.entity.StreakRecord;
import com.memory.entity.TrainRecord;
import com.memory.repository.DailyChallengeRepository;
import com.memory.repository.StreakRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TrainRecordServiceTest {

    @Autowired
    private TrainRecordService service;
    @Autowired
    private StreakRecordRepository streakRepository;
    @Autowired
    private DailyChallengeRepository challengeRepository;

    @BeforeEach
    void clean() {
        streakRepository.deleteAll();
        challengeRepository.deleteAll();
    }

    @Test
    void clampsAccuracyRateIntoZeroToOne() {
        assertThat(service.save(record("PAO", 1.5)).getAccuracyRate()).isEqualTo(1.0);
        assertThat(service.save(record("PAO", -0.2)).getAccuracyRate()).isEqualTo(0.0);
    }

    @Test
    void firstTrainingStartsStreakAtOne() {
        service.save(record("PAO", 0.8));

        StreakRecord streak = currentStreak();
        assertThat(streak.getCurrentStreak()).isEqualTo(1);
        assertThat(streak.getLongestStreak()).isEqualTo(1);
        assertThat(streak.getLastTrainDate()).isEqualTo(LocalDate.now());
    }

    @Test
    void trainingTwiceOnSameDayDoesNotIncreaseStreak() {
        service.save(record("PAO", 0.8));
        service.save(record("WORDS", 0.8));

        assertThat(currentStreak().getCurrentStreak()).isEqualTo(1);
    }

    @Test
    void trainingOnConsecutiveDayIncrementsStreak() {
        givenStreak(LocalDate.now().minusDays(1), 3, 3);

        service.save(record("PAO", 0.8));

        StreakRecord streak = currentStreak();
        assertThat(streak.getCurrentStreak()).isEqualTo(4);
        assertThat(streak.getLongestStreak()).isEqualTo(4);
    }

    @Test
    void missingADayResetsStreakButKeepsLongest() {
        givenStreak(LocalDate.now().minusDays(3), 5, 7);

        service.save(record("PAO", 0.8));

        StreakRecord streak = currentStreak();
        assertThat(streak.getCurrentStreak()).isEqualTo(1);
        assertThat(streak.getLongestStreak()).isEqualTo(7);
    }

    @Test
    void trainingTheDailyChallengeModuleUpdatesChallengeBests() {
        service.save(record("PAO", 0.5)); // creates today's challenge
        DailyChallenge before = challengeRepository.findByChallengeDate(LocalDate.now()).orElseThrow();
        int attemptsBefore = before.getAttempts();

        TrainRecord r = record(before.getModuleType(), 0.9);
        r.setDurationSeconds(42);
        service.save(r);

        DailyChallenge after = challengeRepository.findByChallengeDate(LocalDate.now()).orElseThrow();
        assertThat(after.getAttempts()).isEqualTo(attemptsBefore + 1);
        assertThat(after.getBestAccuracy()).isEqualTo(0.9);
        assertThat(after.getBestTimeSeconds()).isEqualTo(42);
    }

    private StreakRecord currentStreak() {
        return streakRepository.findFirstByOrderByIdAsc().orElseThrow();
    }

    private void givenStreak(LocalDate lastTrainDate, int current, int longest) {
        StreakRecord s = new StreakRecord();
        s.setLastTrainDate(lastTrainDate);
        s.setCurrentStreak(current);
        s.setLongestStreak(longest);
        streakRepository.save(s);
    }

    private static TrainRecord record(String module, double accuracy) {
        TrainRecord r = new TrainRecord();
        r.setModuleType(module);
        r.setAccuracyRate(accuracy);
        r.setDurationSeconds(60);
        r.setTotalItems(20);
        return r;
    }
}
