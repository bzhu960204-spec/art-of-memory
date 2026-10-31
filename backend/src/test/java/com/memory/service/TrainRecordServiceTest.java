package com.memory.service;

import com.memory.common.ModuleType;
import com.memory.dto.AchievementView;
import com.memory.dto.TrainRecordRequest;
import com.memory.entity.DailyChallenge;
import com.memory.entity.StreakRecord;
import com.memory.repository.AchievementRepository;
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
    private StreakService streakService;
    @Autowired
    private AchievementService achievementService;
    @Autowired
    private StreakRecordRepository streakRepository;
    @Autowired
    private DailyChallengeRepository challengeRepository;
    @Autowired
    private AchievementRepository achievementRepository;

    @BeforeEach
    void clean() {
        streakRepository.deleteAll();
        challengeRepository.deleteAll();
        achievementRepository.deleteAll();
    }

    @Test
    void clampsAccuracyRateIntoZeroToOne() {
        assertThat(service.save(record(ModuleType.PAO, 1.5)).getAccuracyRate()).isEqualTo(1.0);
        assertThat(service.save(record(ModuleType.PAO, -0.2)).getAccuracyRate()).isEqualTo(0.0);
    }

    @Test
    void storesModuleTypeByName() {
        assertThat(service.save(record(ModuleType.TEXT, 0.5)).getModuleType()).isEqualTo("TEXT");
    }

    // ---- streak ----

    @Test
    void firstTrainingStartsStreakAtOne() {
        service.save(record(ModuleType.PAO, 0.8));

        StreakRecord streak = storedStreak();
        assertThat(streak.getCurrentStreak()).isEqualTo(1);
        assertThat(streak.getLongestStreak()).isEqualTo(1);
        assertThat(streak.getLastTrainDate()).isEqualTo(LocalDate.now());
    }

    @Test
    void trainingTwiceOnSameDayDoesNotIncreaseStreak() {
        service.save(record(ModuleType.PAO, 0.8));
        service.save(record(ModuleType.WORDS, 0.8));

        assertThat(storedStreak().getCurrentStreak()).isEqualTo(1);
    }

    @Test
    void trainingOnConsecutiveDayIncrementsStreak() {
        givenStreak(LocalDate.now().minusDays(1), 3, 3);

        service.save(record(ModuleType.PAO, 0.8));

        assertThat(storedStreak().getCurrentStreak()).isEqualTo(4);
        assertThat(storedStreak().getLongestStreak()).isEqualTo(4);
    }

    @Test
    void missingADayResetsStreakButKeepsLongest() {
        givenStreak(LocalDate.now().minusDays(3), 5, 7);

        service.save(record(ModuleType.PAO, 0.8));

        assertThat(storedStreak().getCurrentStreak()).isEqualTo(1);
        assertThat(storedStreak().getLongestStreak()).isEqualTo(7);
    }

    @Test
    void readingABrokenStreakReportsZeroWithoutModifyingData() {
        givenStreak(LocalDate.now().minusDays(3), 5, 7);

        var view = streakService.getStreak(LocalDate.now());

        assertThat(view.currentStreak()).isZero();
        assertThat(view.longestStreak()).isEqualTo(7);
        assertThat(storedStreak().getCurrentStreak()).isEqualTo(5);
    }

    @Test
    void readingAStreakFromYesterdayIsStillAlive() {
        givenStreak(LocalDate.now().minusDays(1), 4, 4);

        assertThat(streakService.getStreak(LocalDate.now()).currentStreak()).isEqualTo(4);
    }

    // ---- daily challenge ----

    @Test
    void dailyChallengeModuleFollowsStableRotation() {
        assertThat(DailyChallengeService.moduleFor(LocalDate.of(2026, 1, 1))).isEqualTo(ModuleType.WORDS);
        assertThat(DailyChallengeService.moduleFor(LocalDate.of(2026, 1, 5))).isEqualTo(ModuleType.NUMBERS);
    }

    @Test
    void trainingTheDailyChallengeModuleUpdatesChallengeBests() {
        ModuleType todays = DailyChallengeService.moduleFor(LocalDate.now());

        service.save(record(todays, 0.5));
        service.save(withDuration(record(todays, 0.9), 42));

        DailyChallenge challenge = challengeRepository.findByChallengeDate(LocalDate.now()).orElseThrow();
        assertThat(challenge.getAttempts()).isEqualTo(2);
        assertThat(challenge.getBestAccuracy()).isEqualTo(0.9);
        assertThat(challenge.getBestTimeSeconds()).isEqualTo(42);
    }

    @Test
    void trainingAnotherModuleDoesNotCountTowardsDailyChallenge() {
        ModuleType other = ModuleType.TEXT;

        service.save(record(other, 1.0));

        assertThat(challengeRepository.findByChallengeDate(LocalDate.now()).orElseThrow().getAttempts()).isZero();
    }

    // ---- achievements ----

    @Test
    void tenPerfectSessionsUnlockPerfectionist() {
        for (int i = 0; i < 9; i++) service.save(record(ModuleType.PAO, 1.0));
        assertThat(achievement("perfect_10").unlocked()).isFalse();
        assertThat(achievement("perfect_10").progress()).isEqualTo(9);

        service.save(record(ModuleType.PAO, 1.0));

        assertThat(achievement("perfect_10").unlocked()).isTrue();
        assertThat(achievement("perfect_10").unlockedTime()).isNotNull();
    }

    @Test
    void streakAchievementTracksLongestStreak() {
        givenStreak(LocalDate.now().minusDays(1), 6, 6);

        service.save(record(ModuleType.PAO, 0.5));

        assertThat(achievement("streak_7").unlocked()).isTrue();
        assertThat(achievement("streak_30").progress()).isEqualTo(7);
    }

    @Test
    void refreshBackfillsFromExistingDataAndIsIdempotent() {
        givenStreak(LocalDate.now(), 8, 8);

        achievementService.refresh();
        var firstUnlock = achievement("streak_7").unlockedTime();
        achievementService.refresh();

        assertThat(achievement("streak_7").unlocked()).isTrue();
        assertThat(achievement("streak_7").unlockedTime()).isEqualTo(firstUnlock);
        assertThat(achievementRepository.count()).isEqualTo(5);
    }

    private AchievementView achievement(String key) {
        return achievementService.list().stream().filter(a -> a.key().equals(key)).findFirst().orElseThrow();
    }

    private StreakRecord storedStreak() {
        return streakRepository.findFirstByOrderByIdAsc().orElseThrow();
    }

    private void givenStreak(LocalDate lastTrainDate, int current, int longest) {
        StreakRecord s = new StreakRecord();
        s.setLastTrainDate(lastTrainDate);
        s.setCurrentStreak(current);
        s.setLongestStreak(longest);
        streakRepository.save(s);
    }

    private static TrainRecordRequest record(ModuleType module, double accuracy) {
        return new TrainRecordRequest(module, 60, accuracy, null, 20);
    }

    private static TrainRecordRequest withDuration(TrainRecordRequest r, int seconds) {
        return new TrainRecordRequest(r.moduleType(), seconds, r.accuracyRate(), r.avgResponseMs(), r.totalItems());
    }
}
