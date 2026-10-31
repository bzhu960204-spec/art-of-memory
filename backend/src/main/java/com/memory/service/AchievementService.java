package com.memory.service;

import com.memory.dto.AchievementView;
import com.memory.entity.Achievement;
import com.memory.repository.AchievementRepository;
import com.memory.repository.TrainRecordRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AchievementService {

    private enum Metric { LONGEST_STREAK, PERFECT_SESSIONS, TOTAL_SESSIONS }

    private record Definition(String key, String name, String description, String icon, int target, Metric metric) {
    }

    private static final List<Definition> DEFINITIONS = List.of(
            new Definition("streak_7", "周练达人", "连续训练7天", "🔥", 7, Metric.LONGEST_STREAK),
            new Definition("streak_30", "月练大师", "连续训练30天", "💪", 30, Metric.LONGEST_STREAK),
            new Definition("perfect_10", "完美主义者", "获得10次满分", "⭐", 10, Metric.PERFECT_SESSIONS),
            new Definition("sessions_50", "坚持不懈", "完成50次训练", "🎯", 50, Metric.TOTAL_SESSIONS),
            new Definition("sessions_200", "记忆大师", "完成200次训练", "🏆", 200, Metric.TOTAL_SESSIONS)
    );

    private final AchievementRepository achievementRepository;
    private final TrainRecordRepository trainRecordRepository;
    private final StreakService streakService;

    public AchievementService(AchievementRepository achievementRepository,
                              TrainRecordRepository trainRecordRepository,
                              StreakService streakService) {
        this.achievementRepository = achievementRepository;
        this.trainRecordRepository = trainRecordRepository;
        this.streakService = streakService;
    }

    /** Recomputes progress from existing data on startup, so achievements earned before this logic existed are unlocked. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void backfillOnStartup() {
        refresh();
    }

    /** Recomputes progress of every achievement from training data and unlocks newly reached ones. */
    @Transactional
    public void refresh() {
        Map<Metric, Integer> values = Map.of(
                Metric.LONGEST_STREAK, streakService.getStreak(LocalDate.now()).longestStreak(),
                Metric.PERFECT_SESSIONS, (int) trainRecordRepository.countByAccuracyRateGreaterThanEqual(1.0),
                Metric.TOTAL_SESSIONS, (int) trainRecordRepository.count());
        Map<String, Achievement> stored = storedByKey();

        for (Definition def : DEFINITIONS) {
            Achievement ach = stored.computeIfAbsent(def.key(), key -> {
                Achievement a = new Achievement();
                a.setAchievementKey(key);
                a.setProgress(0);
                return a;
            });
            ach.setTarget(def.target());
            ach.setProgress(Math.max(ach.getProgress(), values.get(def.metric())));
            if (ach.getProgress() >= def.target() && ach.getUnlockedTime() == null) {
                ach.setUnlockedTime(LocalDateTime.now());
            }
            achievementRepository.save(ach);
        }
    }

    @Transactional(readOnly = true)
    public List<AchievementView> list() {
        Map<String, Achievement> stored = storedByKey();
        return DEFINITIONS.stream().map(def -> {
            Achievement ach = stored.get(def.key());
            int progress = ach != null ? ach.getProgress() : 0;
            LocalDateTime unlockedTime = ach != null ? ach.getUnlockedTime() : null;
            return new AchievementView(def.key(), def.name(), def.description(), def.icon(), def.target(),
                    progress, unlockedTime != null, unlockedTime);
        }).toList();
    }

    private Map<String, Achievement> storedByKey() {
        return achievementRepository.findAll().stream()
                .collect(Collectors.toMap(Achievement::getAchievementKey, Function.identity()));
    }
}
