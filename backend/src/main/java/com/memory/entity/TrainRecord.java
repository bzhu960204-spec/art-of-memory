package com.memory.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "train_records")
public class TrainRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "module_type", nullable = false, length = 30)
    private String moduleType;

    @Column(name = "duration_seconds", nullable = false)
    private Integer durationSeconds;

    @Column(name = "accuracy_rate", nullable = false)
    private Double accuracyRate;

    @Column(name = "avg_response_ms")
    private Integer avgResponseMs;

    @Column(name = "total_items", nullable = false)
    private Integer totalItems;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    @PrePersist
    protected void onCreate() {
        this.createdTime = LocalDateTime.now();
    }

    public TrainRecord() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getModuleType() { return moduleType; }
    public void setModuleType(String moduleType) { this.moduleType = moduleType; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
    public Double getAccuracyRate() { return accuracyRate; }
    public void setAccuracyRate(Double accuracyRate) { this.accuracyRate = accuracyRate; }
    public Integer getAvgResponseMs() { return avgResponseMs; }
    public void setAvgResponseMs(Integer avgResponseMs) { this.avgResponseMs = avgResponseMs; }
    public Integer getTotalItems() { return totalItems; }
    public void setTotalItems(Integer totalItems) { this.totalItems = totalItems; }
    public LocalDateTime getCreatedTime() { return createdTime; }
    public void setCreatedTime(LocalDateTime createdTime) { this.createdTime = createdTime; }
}
