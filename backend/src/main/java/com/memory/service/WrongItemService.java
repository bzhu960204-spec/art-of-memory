package com.memory.service;

import com.memory.common.ModuleType;
import com.memory.dto.ReviewItem;
import com.memory.entity.WrongItem;
import com.memory.repository.WrongItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class WrongItemService {

    private final WrongItemRepository repository;

    public WrongItemService(WrongItemRepository repository) {
        this.repository = repository;
    }

    /** Increments the error count of every item rated as rusty or unknown. */
    @Transactional
    public void recordReview(ModuleType module, List<ReviewItem> items) {
        for (ReviewItem item : items) {
            if (!item.failed()) continue;
            WrongItem wrong = repository.findByModuleTypeAndItemContent(module.name(), item.numberString())
                    .orElseGet(() -> {
                        WrongItem w = new WrongItem();
                        w.setModuleType(module.name());
                        w.setItemContent(item.numberString());
                        w.setErrorCount(0);
                        return w;
                    });
            wrong.setErrorCount(wrong.getErrorCount() + 1);
            wrong.setLastFailedTime(LocalDateTime.now());
            repository.save(wrong);
        }
    }
}
