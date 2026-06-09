package com.memory.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "daily_challenges")
public class DailyChallenge {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "challenge_date", nullable = false)
    private LocalDate challengeDate;

    @Column(name = "module_type", nullable = false, length = 30)
    private String moduleType;

    @Column(name = "seed", nullable = false)
    private Long seed;

    @Column(name = "best_accuracy")
    private Double bestAccuracy;

    @Column(name = "best_time_seconds")
    private Integer bestTimeSeconds;

    @Column(name = "attempts")
    private Integer attempts = 0;

    public DailyChallenge() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getChallengeDate() { return challengeDate; }
    public void setChallengeDate(LocalDate challengeDate) { this.challengeDate = challengeDate; }
    public String getModuleType() { return moduleType; }
    public void setModuleType(String moduleType) { this.moduleType = moduleType; }
    public Long getSeed() { return seed; }
    public void setSeed(Long seed) { this.seed = seed; }
    public Double getBestAccuracy() { return bestAccuracy; }
    public void setBestAccuracy(Double bestAccuracy) { this.bestAccuracy = bestAccuracy; }
    public Integer getBestTimeSeconds() { return bestTimeSeconds; }
    public void setBestTimeSeconds(Integer bestTimeSeconds) { this.bestTimeSeconds = bestTimeSeconds; }
    public Integer getAttempts() { return attempts; }
    public void setAttempts(Integer attempts) { this.attempts = attempts; }
}
