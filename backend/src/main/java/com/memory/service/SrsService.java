package com.memory.service;

import com.memory.common.ModuleType;
import com.memory.dto.ReviewItem;
import com.memory.entity.SrsCard;
import com.memory.repository.SrsCardRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * SM-2 spaced repetition. Ratings map to SM-2 quality: 1 (proficient) = 5, 2 (rusty) = 3, 3 (unknown) = 1.
 */
@Service
public class SrsService {

    public record SrsStats(long due, long learned) {
    }

    static final double MIN_EASE = 1.3;

    private final SrsCardRepository repository;

    public SrsService(SrsCardRepository repository) {
        this.repository = repository;
    }

    /**
     * Schedules every reviewed item. Within one session a card may be shown several times
     * (it is re-queued after a miss); only its first rating counts, as that reflects real recall.
     */
    @Transactional
    public void recordReview(ModuleType module, List<ReviewItem> items, LocalDate today) {
        Map<String, Integer> firstRating = new LinkedHashMap<>();
        items.forEach(i -> firstRating.putIfAbsent(i.numberString(), i.rating()));

        Map<String, SrsCard> existing = repository.findByModuleTypeAndItemKeyIn(module.name(), firstRating.keySet())
                .stream().collect(Collectors.toMap(SrsCard::getItemKey, Function.identity()));

        firstRating.forEach((key, rating) -> {
            SrsCard card = existing.computeIfAbsent(key, k -> {
                SrsCard c = new SrsCard();
                c.setModuleType(module.name());
                c.setItemKey(k);
                return c;
            });
            schedule(card, qualityOf(rating), today);
            card.setLastReviewed(LocalDateTime.now());
        });
        repository.saveAll(existing.values());
    }

    /** Item keys that are due on or before {@code today}, most overdue / hardest first. */
    @Transactional(readOnly = true)
    public List<String> dueItems(ModuleType module, LocalDate today, int limit) {
        return repository.findByModuleTypeAndDueDateLessThanEqualOrderByDueDateAscEaseFactorAsc(
                        module.name(), today, PageRequest.of(0, limit))
                .stream().map(SrsCard::getItemKey).toList();
    }

    @Transactional(readOnly = true)
    public SrsStats stats(ModuleType module, LocalDate today) {
        return new SrsStats(
                repository.countByModuleTypeAndDueDateLessThanEqual(module.name(), today),
                repository.countByModuleType(module.name()));
    }

    static int qualityOf(int rating) {
        return switch (rating) {
            case 1 -> 5;
            case 2 -> 3;
            default -> 1;
        };
    }

    /** Applies one SM-2 step to the card. */
    static void schedule(SrsCard card, int quality, LocalDate today) {
        if (quality < 3) {
            card.setRepetitions(0);
            card.setIntervalDays(1);
        } else {
            int reps = card.getRepetitions() + 1;
            int interval = switch (reps) {
                case 1 -> 1;
                case 2 -> 6;
                default -> (int) Math.round(card.getIntervalDays() * card.getEaseFactor());
            };
            card.setRepetitions(reps);
            card.setIntervalDays(interval);
        }
        double ease = card.getEaseFactor() + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
        card.setEaseFactor(Math.max(MIN_EASE, ease));
        card.setDueDate(today.plusDays(card.getIntervalDays()));
    }
}
