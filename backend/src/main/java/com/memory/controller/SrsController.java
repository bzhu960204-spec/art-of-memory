package com.memory.controller;

import com.memory.common.ModuleType;
import com.memory.common.Result;
import com.memory.service.SrsService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/srs")
@Validated
public class SrsController {

    private final SrsService srsService;

    public SrsController(SrsService srsService) {
        this.srsService = srsService;
    }

    /** Keys of items due for review today, most overdue first. */
    @GetMapping("/due")
    public Result<List<String>> due(@RequestParam ModuleType module,
                                    @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return Result.success(srsService.dueItems(module, LocalDate.now(), limit));
    }

    @GetMapping("/stats")
    public Result<SrsService.SrsStats> stats(@RequestParam ModuleType module) {
        return Result.success(srsService.stats(module, LocalDate.now()));
    }
}
