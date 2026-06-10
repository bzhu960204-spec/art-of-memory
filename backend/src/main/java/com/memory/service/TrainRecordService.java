package com.memory.service;

import com.memory.entity.DailyChallenge;
import com.memory.entity.StreakRecord;
import com.memory.entity.TrainRecord;
import com.memory.repository.DailyChallengeRepository;
import com.memory.repository.StreakRecordRepository;
import com.memory.repository.TrainRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class TrainRecordService {

    private final TrainRecordRepository trainRecordRepository;
    private final StreakRecordRepository streakRecordRepository;
    private final DailyChallengeRepository dailyChallengeRepository;

    public TrainRecordService(TrainRecordRepository trainRecordRepository,
                              StreakRecordRepository streakRecordRepository,
                              DailyChallengeRepository dailyChallengeRepository) {
        this.trainRecordRepository = trainRecordRepository;
        this.streakRecordRepository = streakRecordRepository;
        this.dailyChallengeRepository = dailyChallengeRepository;
    }

    @Transactional
    public TrainRecord save(TrainRecord record) {
        // Validate accuracy rate
        if (record.getAccuracyRate() != null) {
            record.setAccuracyRate(Math.max(0, Math.min(1, record.getAccuracyRate())));
        }
        TrainRecord saved = trainRecordRepository.save(record);
        updateStreak();
        updateDailyChallenge(record);
        return saved;
    }

    private void updateDailyChallenge(TrainRecord record) {
        LocalDate today = LocalDate.now();
        DailyChallenge challenge = dailyChallengeRepository.findByChallengeDate(today)
                .orElseGet(() -> {
                    DailyChallenge dc = new DailyChallenge();
                    dc.setChallengeDate(today);
                    String[] modules = {"NUMBERS", "WORDS", "CARDS", "PAO", "OBJECT"};
                    dc.setModuleType(modules[today.getDayOfYear() % modules.length]);
                    dc.setSeed(today.toEpochDay());
                    dc.setAttempts(0);
                    return dailyChallengeRepository.save(dc);
                });

        // Update daily challenge if module type matches
        if (challenge.getModuleType().equals(record.getModuleType())) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            double accuracy = record.getAccuracyRate() != null ? record.getAccuracyRate() : 0;
            if (challenge.getBestAccuracy() == null || accuracy > challenge.getBestAccuracy()) {
                challenge.setBestAccuracy(accuracy);
            }
            int timeSeconds = record.getDurationSeconds() != null ? record.getDurationSeconds() : 0;
            if (timeSeconds > 0 && (challenge.getBestTimeSeconds() == null || timeSeconds < challenge.getBestTimeSeconds())) {
                challenge.setBestTimeSeconds(timeSeconds);
            }
            dailyChallengeRepository.save(challenge);
        }
    }

    public List<TrainRecord> getByModule(String moduleType) {
        return trainRecordRepository.findByModuleTypeOrderByCreatedTimeDesc(moduleType);
    }

    public List<TrainRecord> getRecent() {
        return trainRecordRepository.findTop20ByOrderByCreatedTimeDesc();
    }

    private void updateStreak() {
        StreakRecord streak = streakRecordRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> {
                    StreakRecord sr = new StreakRecord();
                    sr.setCurrentStreak(0);
                    sr.setLongestStreak(0);
                    return sr;
                });

        LocalDate today = LocalDate.now();
        if (streak.getLastTrainDate() == null) {
            streak.setCurrentStreak(1);
            streak.setLongestStreak(1);
        } else if (streak.getLastTrainDate().equals(today)) {
            return; // Already updated today
        } else if (streak.getLastTrainDate().equals(today.minusDays(1))) {
            streak.setCurrentStreak(streak.getCurrentStreak() + 1);
            if (streak.getCurrentStreak() > streak.getLongestStreak()) {
                streak.setLongestStreak(streak.getCurrentStreak());
            }
        } else {
            streak.setCurrentStreak(1);
        }
        streak.setLastTrainDate(today);
        streakRecordRepository.save(streak);
    }
}
