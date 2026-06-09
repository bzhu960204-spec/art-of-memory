package com.memory.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "achievements")
public class Achievement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "achievement_key", nullable = false, unique = true, length = 50)
    private String achievementKey;

    @Column(name = "unlocked_time")
    private LocalDateTime unlockedTime;

    @Column(name = "progress")
    private Integer progress = 0;

    @Column(name = "target")
    private Integer target;

    public Achievement() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAchievementKey() { return achievementKey; }
    public void setAchievementKey(String achievementKey) { this.achievementKey = achievementKey; }
    public LocalDateTime getUnlockedTime() { return unlockedTime; }
    public void setUnlockedTime(LocalDateTime unlockedTime) { this.unlockedTime = unlockedTime; }
    public Integer getProgress() { return progress; }
    public void setProgress(Integer progress) { this.progress = progress; }
    public Integer getTarget() { return target; }
    public void setTarget(Integer target) { this.target = target; }
}
