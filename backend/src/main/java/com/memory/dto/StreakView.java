package com.memory.dto;

import java.time.LocalDate;

/** Read-only view of the training streak. */
public record StreakView(int currentStreak, int longestStreak, LocalDate lastTrainDate) {
}
