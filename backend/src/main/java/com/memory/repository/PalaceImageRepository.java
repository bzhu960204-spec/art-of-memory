package com.memory.repository;

import com.memory.entity.PalaceImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PalaceImageRepository extends JpaRepository<PalaceImage, Long> {
    List<PalaceImage> findAllByOrderByCreatedTimeAsc();
}
