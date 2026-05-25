package com.memory.repository;

import com.memory.entity.PaoCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PaoCodeRepository extends JpaRepository<PaoCode, Long> {
    @Query(value = "SELECT * FROM pao_codes ORDER BY RAND() LIMIT :limit", nativeQuery = true)
    List<PaoCode> findRandom(@Param("limit") int limit);
}
