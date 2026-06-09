package com.memory.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "streak_records")
public class StreakRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "last_train_date")
    private LocalDate lastTrainDate;

    @Column(name = "current_streak")
    private Integer currentStreak = 0;

    @Column(name = "longest_streak")
    private Integer longestStreak = 0;

    public StreakRecord() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getLastTrainDate() { return lastTrainDate; }
    public void setLastTrainDate(LocalDate lastTrainDate) { this.lastTrainDate = lastTrainDate; }
    public Integer getCurrentStreak() { return currentStreak; }
    public void setCurrentStreak(Integer currentStreak) { this.currentStreak = currentStreak; }
    public Integer getLongestStreak() { return longestStreak; }
    public void setLongestStreak(Integer longestStreak) { this.longestStreak = longestStreak; }
}
