package com.memory.service;

import com.memory.dto.TrainRecordRequest;
import com.memory.entity.TrainRecord;
import com.memory.repository.TrainRecordRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class TrainRecordService {

    private final TrainRecordRepository trainRecordRepository;
    private final StreakService streakService;
    private final DailyChallengeService dailyChallengeService;
    private final AchievementService achievementService;

    public TrainRecordService(TrainRecordRepository trainRecordRepository,
                              StreakService streakService,
                              DailyChallengeService dailyChallengeService,
                              AchievementService achievementService) {
        this.trainRecordRepository = trainRecordRepository;
        this.streakService = streakService;
        this.dailyChallengeService = dailyChallengeService;
        this.achievementService = achievementService;
    }

    /** Saves a finished session and updates streak, daily challenge and achievements. */
    @Transactional
    public TrainRecord save(TrainRecordRequest request) {
        TrainRecord record = new TrainRecord();
        record.setModuleType(request.moduleType().name());
        record.setDurationSeconds(request.durationSeconds());
        record.setAccuracyRate(Math.max(0, Math.min(1, request.accuracyRate())));
        record.setAvgResponseMs(request.avgResponseMs());
        record.setTotalItems(request.totalItems());
        TrainRecord saved = trainRecordRepository.save(record);

        LocalDate today = LocalDate.now();
        streakService.recordTraining(today);
        dailyChallengeService.recordResult(saved, today);
        achievementService.refresh();
        return saved;
    }

    @Transactional(readOnly = true)
    public List<TrainRecord> getRecent(String moduleType, int limit) {
        PageRequest page = PageRequest.of(0, limit);
        return moduleType != null && !moduleType.isEmpty()
                ? trainRecordRepository.findByModuleTypeOrderByCreatedTimeDesc(moduleType, page)
                : trainRecordRepository.findAllByOrderByCreatedTimeDesc(page);
    }
}
