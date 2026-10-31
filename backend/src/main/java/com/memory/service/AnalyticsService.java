package com.memory.service;

import com.memory.dto.AnalyticsDtos.ModuleBest;
import com.memory.dto.AnalyticsDtos.ModuleStats;
import com.memory.dto.AnalyticsDtos.Summary;
import com.memory.dto.AnalyticsDtos.TrendPoint;
import com.memory.entity.TrainRecord;
import com.memory.entity.WrongItem;
import com.memory.repository.TrainRecordRepository;
import com.memory.repository.WrongItemRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final TrainRecordRepository trainRecordRepository;
    private final WrongItemRepository wrongItemRepository;

    public AnalyticsService(TrainRecordRepository trainRecordRepository, WrongItemRepository wrongItemRepository) {
        this.trainRecordRepository = trainRecordRepository;
        this.wrongItemRepository = wrongItemRepository;
    }

    /** Per-day aggregates for the last {@code days} days, optionally for one module only. */
    public List<TrendPoint> trend(int days, String module) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<TrainRecord> records = module != null && !module.isEmpty()
                ? trainRecordRepository.findByModuleSince(module, since)
                : trainRecordRepository.findAllSince(since);

        Map<String, List<TrainRecord>> byDate = records.stream().collect(Collectors.groupingBy(
                r -> r.getCreatedTime().toLocalDate().toString(), LinkedHashMap::new, Collectors.toList()));

        return byDate.entrySet().stream().map(e -> {
            List<TrainRecord> day = e.getValue();
            return new TrendPoint(
                    e.getKey(),
                    day.size(),
                    day.stream().mapToDouble(TrainRecord::getAccuracyRate).average().orElse(0),
                    day.stream().filter(r -> r.getAvgResponseMs() != null)
                            .mapToInt(TrainRecord::getAvgResponseMs).average().orElse(0),
                    day.stream().mapToInt(TrainRecord::getTotalItems).sum());
        }).toList();
    }

    public Summary summary(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<ModuleStats> modules = trainRecordRepository.getModuleStats(since).stream()
                .map(row -> new ModuleStats(
                        (String) row[0],
                        ((Number) row[1]).longValue(),
                        toDouble(row[2]),
                        toDouble(row[3])))
                .toList();
        long totalSessions = modules.stream().mapToLong(ModuleStats::sessions).sum();

        Map<String, Long> heatmap = trainRecordRepository.findCreatedTimesSince(since).stream()
                .collect(Collectors.groupingBy(t -> t.toLocalDate().toString(), TreeMap::new, Collectors.counting()));

        return new Summary(modules, totalSessions, heatmap);
    }

    public List<WrongItem> weakest(int limit, String module) {
        PageRequest page = PageRequest.of(0, limit);
        return module != null && !module.isEmpty()
                ? wrongItemRepository.findByModuleTypeOrderByErrorCountDesc(module, page)
                : wrongItemRepository.findAllByOrderByErrorCountDesc(page);
    }

    /** Personal bests over all time, keyed by module type. */
    public Map<String, ModuleBest> bests() {
        Map<String, ModuleBest> result = new LinkedHashMap<>();
        for (Object[] row : trainRecordRepository.getBestsByModule()) {
            result.put((String) row[0], new ModuleBest(
                    toDouble(row[1]),
                    row[2] != null ? ((Number) row[2]).intValue() : 0,
                    ((Number) row[3]).longValue(),
                    row[4] != null ? ((Number) row[4]).longValue() : 0));
        }
        return result;
    }

    private static double toDouble(Object value) {
        return value != null ? ((Number) value).doubleValue() : 0;
    }
}
