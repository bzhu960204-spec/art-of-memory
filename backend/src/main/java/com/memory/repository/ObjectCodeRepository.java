package com.memory.repository;

import com.memory.entity.ObjectCode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ObjectCodeRepository extends JpaRepository<ObjectCode, Long> {
    List<ObjectCode> findAllByOrderByNumberStringAsc();
    Optional<ObjectCode> findByNumberString(String numberString);
}
