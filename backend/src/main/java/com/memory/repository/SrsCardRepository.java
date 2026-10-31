package com.memory.repository;

import com.memory.entity.SrsCard;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface SrsCardRepository extends JpaRepository<SrsCard, Long> {

    List<SrsCard> findByModuleTypeAndItemKeyIn(String moduleType, Collection<String> itemKeys);

    List<SrsCard> findByModuleTypeAndDueDateLessThanEqualOrderByDueDateAscEaseFactorAsc(
            String moduleType, LocalDate date, Pageable pageable);

    long countByModuleTypeAndDueDateLessThanEqual(String moduleType, LocalDate date);

    long countByModuleType(String moduleType);
}
