package com.memory.repository;

import com.memory.entity.TrainRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TrainRecordRepository extends JpaRepository<TrainRecord, Long> {
    List<TrainRecord> findByModuleTypeOrderByCreatedTimeDesc(String moduleType);
    List<TrainRecord> findTop20ByOrderByCreatedTimeDesc();
}
