package com.memory.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "wrong_items")
public class WrongItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "module_type", nullable = false, length = 30)
    private String moduleType;

    @Column(name = "item_content", nullable = false, length = 255)
    private String itemContent;

    @Column(name = "error_count")
    private Integer errorCount = 1;

    @Column(name = "last_failed_time")
    private LocalDateTime lastFailedTime;

    @PrePersist
    protected void onCreate() {
        this.lastFailedTime = LocalDateTime.now();
    }

    public WrongItem() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getModuleType() { return moduleType; }
    public void setModuleType(String moduleType) { this.moduleType = moduleType; }
    public String getItemContent() { return itemContent; }
    public void setItemContent(String itemContent) { this.itemContent = itemContent; }
    public Integer getErrorCount() { return errorCount; }
    public void setErrorCount(Integer errorCount) { this.errorCount = errorCount; }
    public LocalDateTime getLastFailedTime() { return lastFailedTime; }
    public void setLastFailedTime(LocalDateTime lastFailedTime) { this.lastFailedTime = lastFailedTime; }
}
