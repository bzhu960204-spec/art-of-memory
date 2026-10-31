package com.memory.controller;

import com.memory.common.Result;
import com.memory.dto.AchievementView;
import com.memory.dto.StreakView;
import com.memory.entity.DailyChallenge;
import com.memory.service.AchievementService;
import com.memory.service.DailyChallengeService;
import com.memory.service.StreakService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * Daily challenge, streak and achievements are read-only here;
 * they are updated when a training record is saved (see TrainRecordService).
 */
@RestController
@RequestMapping("/api/challenge")
public class ChallengeController {

    private final DailyChallengeService dailyChallengeService;
    private final StreakService streakService;
    private final AchievementService achievementService;

    public ChallengeController(DailyChallengeService dailyChallengeService,
                               StreakService streakService,
                               AchievementService achievementService) {
        this.dailyChallengeService = dailyChallengeService;
        this.streakService = streakService;
        this.achievementService = achievementService;
    }

    @GetMapping("/daily")
    public Result<DailyChallenge> getDaily() {
        return Result.success(dailyChallengeService.getOrCreate(LocalDate.now()));
    }

    @GetMapping("/daily/history")
    public Result<List<DailyChallenge>> getHistory() {
        return Result.success(dailyChallengeService.recentHistory());
    }

    @GetMapping("/streak")
    public Result<StreakView> getStreak() {
        return Result.success(streakService.getStreak(LocalDate.now()));
    }

    @GetMapping("/achievements")
    public Result<List<AchievementView>> getAchievements() {
        return Result.success(achievementService.list());
    }
}
