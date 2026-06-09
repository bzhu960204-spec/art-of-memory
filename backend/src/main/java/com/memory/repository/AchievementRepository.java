package com.memory.repository;

import com.memory.entity.Achievement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AchievementRepository extends JpaRepository<Achievement, Long> {
    Optional<Achievement> findByAchievementKey(String achievementKey);
    List<Achievement> findByUnlockedTimeIsNotNull();
}
