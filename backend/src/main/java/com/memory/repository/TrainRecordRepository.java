package com.memory.repository;

import com.memory.entity.TrainRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface TrainRecordRepository extends JpaRepository<TrainRecord, Long> {
    List<TrainRecord> findByModuleTypeOrderByCreatedTimeDesc(String moduleType);
    List<TrainRecord> findTop20ByOrderByCreatedTimeDesc();

    // Analytics queries
    @Query("SELECT r FROM TrainRecord r WHERE r.createdTime >= :since ORDER BY r.createdTime ASC")
    List<TrainRecord> findAllSince(@Param("since") LocalDateTime since);

    @Query("SELECT r FROM TrainRecord r WHERE r.moduleType = :module AND r.createdTime >= :since ORDER BY r.createdTime ASC")
    List<TrainRecord> findByModuleSince(@Param("module") String module, @Param("since") LocalDateTime since);

    @Query("SELECT r.moduleType, COUNT(r), AVG(r.accuracyRate), AVG(r.avgResponseMs) FROM TrainRecord r WHERE r.createdTime >= :since GROUP BY r.moduleType")
    List<Object[]> getModuleStats(@Param("since") LocalDateTime since);

    long countByModuleType(String moduleType);
}
