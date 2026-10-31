package com.memory.controller;

import com.memory.common.Result;
import com.memory.dto.AnalyticsDtos.ModuleBest;
import com.memory.dto.AnalyticsDtos.Summary;
import com.memory.dto.AnalyticsDtos.TrendPoint;
import com.memory.entity.WrongItem;
import com.memory.service.AnalyticsService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@Validated
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/trend")
    public Result<List<TrendPoint>> getTrend(@RequestParam(defaultValue = "30") @Min(1) @Max(365) int days,
                                             @RequestParam(required = false) String module) {
        return Result.success(analyticsService.trend(days, module));
    }

    @GetMapping("/summary")
    public Result<Summary> getSummary(@RequestParam(defaultValue = "30") @Min(1) @Max(365) int days) {
        return Result.success(analyticsService.summary(days));
    }

    @GetMapping("/weakest")
    public Result<List<WrongItem>> getWeakest(@RequestParam(defaultValue = "10") @Min(1) @Max(100) int limit,
                                              @RequestParam(required = false) String module) {
        return Result.success(analyticsService.weakest(limit, module));
    }

    @GetMapping("/bests")
    public Result<Map<String, ModuleBest>> getBests() {
        return Result.success(analyticsService.bests());
    }
}
