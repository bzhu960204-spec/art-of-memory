package com.memory.dto;

import java.time.LocalDateTime;

public record AchievementView(
        String key,
        String name,
        String description,
        String icon,
        int target,
        int progress,
        boolean unlocked,
        LocalDateTime unlockedTime
) {
}
