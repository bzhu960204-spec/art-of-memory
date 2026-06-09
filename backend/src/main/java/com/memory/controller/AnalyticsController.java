package com.memory.controller;

import com.memory.common.Result;
import com.memory.entity.TrainRecord;
import com.memory.entity.WrongItem;
import com.memory.repository.TrainRecordRepository;
import com.memory.repository.WrongItemRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final TrainRecordRepository trainRecordRepository;
    private final WrongItemRepository wrongItemRepository;

    public AnalyticsController(TrainRecordRepository trainRecordRepository,
                               WrongItemRepository wrongItemRepository) {
        this.trainRecordRepository = trainRecordRepository;
        this.wrongItemRepository = wrongItemRepository;
    }

    /**
     * Get trend data for a specific module or all modules.
     * @param days number of days to look back (default 30)
     * @param module optional filter by module type
     */
    @GetMapping("/trend")
    public Result<List<Map<String, Object>>> getTrend(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(required = false) String module) {

        LocalDateTime since = LocalDateTime.now().minusDays(Math.min(days, 365));
        List<TrainRecord> records;
        if (module != null && !module.isEmpty()) {
            records = trainRecordRepository.findByModuleSince(module, since);
        } else {
            records = trainRecordRepository.findAllSince(since);
        }

        // Group by date
        Map<String, List<TrainRecord>> grouped = records.stream()
                .collect(Collectors.groupingBy(r -> r.getCreatedTime().toLocalDate().toString(),
                        LinkedHashMap::new, Collectors.toList()));

        List<Map<String, Object>> result = new ArrayList<>();
        grouped.forEach((date, dayRecords) -> {
            Map<String, Object> point = new HashMap<>();
            point.put("date", date);
            point.put("sessions", dayRecords.size());
            point.put("avgAccuracy", dayRecords.stream()
                    .mapToDouble(TrainRecord::getAccuracyRate).average().orElse(0));
            point.put("avgResponseMs", dayRecords.stream()
                    .filter(r -> r.getAvgResponseMs() != null)
                    .mapToInt(TrainRecord::getAvgResponseMs).average().orElse(0));
            point.put("totalItems", dayRecords.stream()
                    .mapToInt(TrainRecord::getTotalItems).sum());
            result.add(point);
        });

        return Result.success(result);
    }

    /**
     * Get per-module statistics summary.
     */
    @GetMapping("/summary")
    public Result<Map<String, Object>> getSummary(@RequestParam(defaultValue = "30") int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(Math.min(days, 365));
        List<Object[]> stats = trainRecordRepository.getModuleStats(since);

        List<Map<String, Object>> modules = new ArrayList<>();
        long totalSessions = 0;
        for (Object[] row : stats) {
            Map<String, Object> m = new HashMap<>();
            m.put("moduleType", row[0]);
            m.put("sessions", ((Number) row[1]).longValue());
            m.put("avgAccuracy", row[2] != null ? ((Number) row[2]).doubleValue() : 0);
            m.put("avgResponseMs", row[3] != null ? ((Number) row[3]).doubleValue() : 0);
            modules.add(m);
            totalSessions += ((Number) row[1]).longValue();
        }

        // Training frequency heatmap (sessions per day for last 30 days)
        List<TrainRecord> allRecords = trainRecordRepository.findAllSince(since);
        Map<String, Long> heatmap = allRecords.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getCreatedTime().toLocalDate().toString(),
                        Collectors.counting()));

        Map<String, Object> result = new HashMap<>();
        result.put("modules", modules);
        result.put("totalSessions", totalSessions);
        result.put("heatmap", heatmap);

        return Result.success(result);
    }

    /**
     * Get weakest items across all modules (highest error counts).
     */
    @GetMapping("/weakest")
    public Result<List<WrongItem>> getWeakest(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String module) {

        List<WrongItem> items;
        if (module != null && !module.isEmpty()) {
            items = wrongItemRepository.findByModuleTypeOrderByErrorCountDesc(module);
        } else {
            items = wrongItemRepository.findAllByOrderByErrorCountDesc();
        }

        // Limit results
        if (items.size() > limit) {
            items = items.subList(0, limit);
        }
        return Result.success(items);
    }

    /**
     * Get personal best records per module.
     */
    @GetMapping("/bests")
    public Result<Map<String, Map<String, Object>>> getBests() {
        Map<String, Map<String, Object>> bests = new HashMap<>();
        String[] modules = {"PAO", "OBJECT", "WORDS", "CARDS", "NUMBERS"};

        for (String mod : modules) {
            List<TrainRecord> records = trainRecordRepository.findByModuleTypeOrderByCreatedTimeDesc(mod);
            if (!records.isEmpty()) {
                Map<String, Object> best = new HashMap<>();
                best.put("bestAccuracy", records.stream()
                        .mapToDouble(TrainRecord::getAccuracyRate).max().orElse(0));
                best.put("bestResponseMs", records.stream()
                        .filter(r -> r.getAvgResponseMs() != null)
                        .mapToInt(TrainRecord::getAvgResponseMs).min().orElse(0));
                best.put("totalSessions", records.size());
                best.put("totalItems", records.stream()
                        .mapToInt(TrainRecord::getTotalItems).sum());
                bests.put(mod, best);
            }
        }
        return Result.success(bests);
    }
}
