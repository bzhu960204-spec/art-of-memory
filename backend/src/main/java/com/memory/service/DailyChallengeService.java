package com.memory.service;

import com.memory.common.ModuleType;
import com.memory.entity.DailyChallenge;
import com.memory.entity.TrainRecord;
import com.memory.repository.DailyChallengeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class DailyChallengeService {

    private final DailyChallengeRepository repository;

    public DailyChallengeService(DailyChallengeRepository repository) {
        this.repository = repository;
    }

    static ModuleType moduleFor(LocalDate date) {
        List<ModuleType> rotation = ModuleType.dailyChallengeRotation();
        return rotation.get(date.getDayOfYear() % rotation.size());
    }

    @Transactional
    public DailyChallenge getOrCreate(LocalDate date) {
        return repository.findByChallengeDate(date).orElseGet(() -> {
            DailyChallenge dc = new DailyChallenge();
            dc.setChallengeDate(date);
            dc.setModuleType(moduleFor(date).name());
            dc.setSeed(date.toEpochDay());
            dc.setAttempts(0);
            return repository.save(dc);
        });
    }

    /** Counts the record towards the challenge of its day if it was trained in the challenge module. */
    @Transactional
    public void recordResult(TrainRecord record, LocalDate date) {
        DailyChallenge challenge = getOrCreate(date);
        if (!challenge.getModuleType().equals(record.getModuleType())) {
            return;
        }
        challenge.setAttempts(challenge.getAttempts() + 1);
        double accuracy = record.getAccuracyRate();
        if (challenge.getBestAccuracy() == null || accuracy > challenge.getBestAccuracy()) {
            challenge.setBestAccuracy(accuracy);
        }
        int seconds = record.getDurationSeconds();
        if (seconds > 0 && (challenge.getBestTimeSeconds() == null || seconds < challenge.getBestTimeSeconds())) {
            challenge.setBestTimeSeconds(seconds);
        }
        repository.save(challenge);
    }

    @Transactional(readOnly = true)
    public List<DailyChallenge> recentHistory() {
        return repository.findTop10ByOrderByChallengeDateDesc();
    }
}
