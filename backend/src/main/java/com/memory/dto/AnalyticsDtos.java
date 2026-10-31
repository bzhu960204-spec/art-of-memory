package com.memory.dto;

import java.util.List;
import java.util.Map;

/** Response types of the analytics endpoints. Field names are part of the frontend contract. */
public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    public record TrendPoint(String date, int sessions, double avgAccuracy, double avgResponseMs, int totalItems) {
    }

    public record ModuleStats(String moduleType, long sessions, double avgAccuracy, double avgResponseMs) {
    }

    /** heatmap: ISO date -> number of sessions on that day. */
    public record Summary(List<ModuleStats> modules, long totalSessions, Map<String, Long> heatmap) {
    }

    public record ModuleBest(double bestAccuracy, int bestResponseMs, long totalSessions, long totalItems) {
    }
}
