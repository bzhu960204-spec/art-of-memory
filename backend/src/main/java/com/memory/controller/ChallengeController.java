package com.memory.controller;

import com.memory.common.Result;
import com.memory.entity.Achievement;
import com.memory.entity.DailyChallenge;
import com.memory.entity.StreakRecord;
import com.memory.repository.AchievementRepository;
import com.memory.repository.DailyChallengeRepository;
import com.memory.repository.StreakRecordRepository;
import com.memory.repository.TrainRecordRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/challenge")
public class ChallengeController {

    private final DailyChallengeRepository dailyChallengeRepository;
    private final AchievementRepository achievementRepository;
    private final StreakRecordRepository streakRecordRepository;
    private final TrainRecordRepository trainRecordRepository;

    public ChallengeController(DailyChallengeRepository dailyChallengeRepository,
                               AchievementRepository achievementRepository,
                               StreakRecordRepository streakRecordRepository,
                               TrainRecordRepository trainRecordRepository) {
        this.dailyChallengeRepository = dailyChallengeRepository;
        this.achievementRepository = achievementRepository;
        this.streakRecordRepository = streakRecordRepository;
        this.trainRecordRepository = trainRecordRepository;
    }

    /**
     * Get today's daily challenge (create if not exists).
     */
    @GetMapping("/daily")
    public Result<DailyChallenge> getDaily() {
        LocalDate today = LocalDate.now();
        DailyChallenge challenge = dailyChallengeRepository.findByChallengeDate(today)
                .orElseGet(() -> {
                    DailyChallenge dc = new DailyChallenge();
                    dc.setChallengeDate(today);
                    // Rotate modules
                    String[] modules = {"NUMBERS", "WORDS", "CARDS", "PAO", "OBJECT"};
                    dc.setModuleType(modules[today.getDayOfYear() % modules.length]);
                    dc.setSeed(today.toEpochDay());
                    dc.setAttempts(0);
                    return dailyChallengeRepository.save(dc);
                });
        return Result.success(challenge);
    }

    /**
     * Submit daily challenge result.
     */
    @PostMapping("/daily/submit")
    @Transactional
    public Result<DailyChallenge> submitDaily(@RequestBody Map<String, Object> body) {
        LocalDate today = LocalDate.now();
        DailyChallenge challenge = dailyChallengeRepository.findByChallengeDate(today)
                .orElse(null);
        if (challenge == null) return Result.error("今日挑战不存在");

        double accuracy = ((Number) body.getOrDefault("accuracy", 0)).doubleValue();
        int timeSeconds = ((Number) body.getOrDefault("timeSeconds", 0)).intValue();

        challenge.setAttempts(challenge.getAttempts() + 1);
        if (challenge.getBestAccuracy() == null || accuracy > challenge.getBestAccuracy()) {
            challenge.setBestAccuracy(accuracy);
        }
        if (challenge.getBestTimeSeconds() == null || (timeSeconds > 0 && timeSeconds < challenge.getBestTimeSeconds())) {
            challenge.setBestTimeSeconds(timeSeconds);
        }
        dailyChallengeRepository.save(challenge);

        // Update streak
        updateStreak();

        // Check achievements
        checkAchievements(accuracy);

        return Result.success(challenge);
    }

    /**
     * Get challenge history.
     */
    @GetMapping("/daily/history")
    public Result<List<DailyChallenge>> getHistory() {
        return Result.success(dailyChallengeRepository.findTop10ByOrderByChallengeDateDesc());
    }

    /**
     * Get streak info.
     */
    @GetMapping("/streak")
    public Result<StreakRecord> getStreak() {
        StreakRecord streak = getOrCreateStreak();
        // Check if streak is still valid
        if (streak.getLastTrainDate() != null) {
            LocalDate today = LocalDate.now();
            long daysBetween = today.toEpochDay() - streak.getLastTrainDate().toEpochDay();
            if (daysBetween > 1) {
                streak.setCurrentStreak(0);
                streakRecordRepository.save(streak);
            }
        }
        return Result.success(streak);
    }

    /**
     * Get all achievements with progress.
     */
    @GetMapping("/achievements")
    public Result<List<Map<String, Object>>> getAchievements() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (AchievementDef def : ACHIEVEMENT_DEFS) {
            Map<String, Object> item = new HashMap<>();
            item.put("key", def.key);
            item.put("name", def.name);
            item.put("description", def.description);
            item.put("icon", def.icon);
            item.put("target", def.target);

            Achievement ach = achievementRepository.findByAchievementKey(def.key).orElse(null);
            item.put("progress", ach != null ? ach.getProgress() : 0);
            item.put("unlocked", ach != null && ach.getUnlockedTime() != null);
            item.put("unlockedTime", ach != null ? ach.getUnlockedTime() : null);
            result.add(item);
        }
        return Result.success(result);
    }

    // ---- Internal methods ----

    private void updateStreak() {
        StreakRecord streak = getOrCreateStreak();
        LocalDate today = LocalDate.now();

        if (streak.getLastTrainDate() == null) {
            streak.setCurrentStreak(1);
            streak.setLongestStreak(1);
        } else if (streak.getLastTrainDate().equals(today)) {
            // Already trained today, no change
            return;
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

        // Check streak achievements
        updateAchievementProgress("streak_7", streak.getCurrentStreak());
        updateAchievementProgress("streak_30", streak.getCurrentStreak());
    }

    private void checkAchievements(double accuracy) {
        // Perfect score
        if (accuracy >= 1.0) {
            incrementAchievement("perfect_10", 1);
        }

        // Total sessions
        long totalSessions = trainRecordRepository.count();
        updateAchievementProgress("sessions_50", (int) totalSessions);
        updateAchievementProgress("sessions_200", (int) totalSessions);
    }

    private StreakRecord getOrCreateStreak() {
        return streakRecordRepository.findFirstByOrderByIdAsc().orElseGet(() -> {
            StreakRecord sr = new StreakRecord();
            sr.setCurrentStreak(0);
            sr.setLongestStreak(0);
            return streakRecordRepository.save(sr);
        });
    }

    private void updateAchievementProgress(String key, int progress) {
        Achievement ach = achievementRepository.findByAchievementKey(key)
                .orElseGet(() -> {
                    Achievement a = new Achievement();
                    a.setAchievementKey(key);
                    a.setProgress(0);
                    AchievementDef def = getDefByKey(key);
                    a.setTarget(def != null ? def.target : 1);
                    return a;
                });
        ach.setProgress(Math.max(ach.getProgress(), progress));
        if (ach.getProgress() >= ach.getTarget() && ach.getUnlockedTime() == null) {
            ach.setUnlockedTime(LocalDateTime.now());
        }
        achievementRepository.save(ach);
    }

    private void incrementAchievement(String key, int delta) {
        Achievement ach = achievementRepository.findByAchievementKey(key)
                .orElseGet(() -> {
                    Achievement a = new Achievement();
                    a.setAchievementKey(key);
                    a.setProgress(0);
                    AchievementDef def = getDefByKey(key);
                    a.setTarget(def != null ? def.target : 1);
                    return a;
                });
        ach.setProgress(ach.getProgress() + delta);
        if (ach.getProgress() >= ach.getTarget() && ach.getUnlockedTime() == null) {
            ach.setUnlockedTime(LocalDateTime.now());
        }
        achievementRepository.save(ach);
    }

    private AchievementDef getDefByKey(String key) {
        return Arrays.stream(ACHIEVEMENT_DEFS)
                .filter(d -> d.key.equals(key))
                .findFirst().orElse(null);
    }

    // ---- Achievement definitions ----
    private static final AchievementDef[] ACHIEVEMENT_DEFS = {
        new AchievementDef("streak_7", "周练达人", "连续训练7天", "🔥", 7),
        new AchievementDef("streak_30", "月练大师", "连续训练30天", "💪", 30),
        new AchievementDef("perfect_10", "完美主义者", "获得10次满分", "⭐", 10),
        new AchievementDef("sessions_50", "坚持不懈", "完成50次训练", "🎯", 50),
        new AchievementDef("sessions_200", "记忆大师", "完成200次训练", "🏆", 200),
    };

    private static class AchievementDef {
        String key, name, description, icon;
        int target;
        AchievementDef(String key, String name, String description, String icon, int target) {
            this.key = key; this.name = name; this.description = description;
            this.icon = icon; this.target = target;
        }
    }
}
