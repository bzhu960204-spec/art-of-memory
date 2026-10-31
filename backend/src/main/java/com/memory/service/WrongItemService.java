package com.memory.service;

import com.memory.common.ModuleType;
import com.memory.dto.ReviewItem;
import com.memory.entity.WrongItem;
import com.memory.repository.WrongItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class WrongItemService {

    private final WrongItemRepository repository;

    public WrongItemService(WrongItemRepository repository) {
        this.repository = repository;
    }

    /**
     * Increments the error count of every item rated as rusty or unknown, and decrements it
     * (removing the item at 0) for items answered correctly every time in this review.
     */
    @Transactional
    public void recordReview(ModuleType module, List<ReviewItem> items) {
        Set<String> failedKeys = items.stream().filter(ReviewItem::failed)
                .map(ReviewItem::numberString).collect(Collectors.toSet());
        Set<String> masteredKeys = items.stream().map(ReviewItem::numberString)
                .filter(k -> !failedKeys.contains(k)).collect(Collectors.toSet());

        for (String key : masteredKeys) {
            repository.findByModuleTypeAndItemContent(module.name(), key).ifPresent(w -> {
                if (w.getErrorCount() <= 1) {
                    repository.delete(w);
                } else {
                    w.setErrorCount(w.getErrorCount() - 1);
                    repository.save(w);
                }
            });
        }

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
