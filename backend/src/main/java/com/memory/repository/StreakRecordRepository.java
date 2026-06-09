package com.memory.repository;

import com.memory.entity.StreakRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StreakRecordRepository extends JpaRepository<StreakRecord, Long> {
    Optional<StreakRecord> findFirstByOrderByIdAsc();
}
