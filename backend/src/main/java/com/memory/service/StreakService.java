package com.memory.service;

import com.memory.dto.StreakView;
import com.memory.entity.StreakRecord;
import com.memory.repository.StreakRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class StreakService {

    private final StreakRecordRepository repository;

    public StreakService(StreakRecordRepository repository) {
        this.repository = repository;
    }

    /** Registers a training on the given day and updates current / longest streak. */
    @Transactional
    public void recordTraining(LocalDate day) {
        StreakRecord streak = repository.findFirstByOrderByIdAsc().orElseGet(() -> {
            StreakRecord sr = new StreakRecord();
            sr.setCurrentStreak(0);
            sr.setLongestStreak(0);
            return sr;
        });

        LocalDate last = streak.getLastTrainDate();
        if (last != null && !day.isAfter(last)) {
            return;
        }
        int current = last != null && last.equals(day.minusDays(1)) ? streak.getCurrentStreak() + 1 : 1;
        streak.setCurrentStreak(current);
        streak.setLongestStreak(Math.max(streak.getLongestStreak(), current));
        streak.setLastTrainDate(day);
        repository.save(streak);
    }

    /** Current streak as of {@code today}; a streak broken by a missed day is reported as 0 without modifying data. */
    @Transactional(readOnly = true)
    public StreakView getStreak(LocalDate today) {
        return repository.findFirstByOrderByIdAsc()
                .map(s -> {
                    LocalDate last = s.getLastTrainDate();
                    boolean alive = last != null && !last.isBefore(today.minusDays(1));
                    return new StreakView(alive ? s.getCurrentStreak() : 0, s.getLongestStreak(), last);
                })
                .orElse(new StreakView(0, 0, null));
    }
}
