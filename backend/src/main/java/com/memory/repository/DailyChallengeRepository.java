package com.memory.repository;

import com.memory.entity.DailyChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyChallengeRepository extends JpaRepository<DailyChallenge, Long> {
    Optional<DailyChallenge> findByChallengeDate(LocalDate date);
    List<DailyChallenge> findTop10ByOrderByChallengeDateDesc();
}
