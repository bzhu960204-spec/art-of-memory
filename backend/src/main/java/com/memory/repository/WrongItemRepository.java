package com.memory.repository;

import com.memory.entity.WrongItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WrongItemRepository extends JpaRepository<WrongItem, Long> {
    List<WrongItem> findByModuleTypeOrderByErrorCountDesc(String moduleType);
    Optional<WrongItem> findByModuleTypeAndItemContent(String moduleType, String itemContent);
}
