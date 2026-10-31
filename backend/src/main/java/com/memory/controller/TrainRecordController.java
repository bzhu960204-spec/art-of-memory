package com.memory.controller;

import com.memory.common.Result;
import com.memory.dto.TrainRecordRequest;
import com.memory.entity.TrainRecord;
import com.memory.service.TrainRecordService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/records")
@Validated
public class TrainRecordController {

    private final TrainRecordService trainRecordService;

    public TrainRecordController(TrainRecordService trainRecordService) {
        this.trainRecordService = trainRecordService;
    }

    @PostMapping("/save")
    public Result<TrainRecord> save(@Valid @RequestBody TrainRecordRequest request) {
        return Result.success(trainRecordService.save(request));
    }

    /** Most recent records, newest first, optionally filtered by module. */
    @GetMapping("/list")
    public Result<List<TrainRecord>> list(@RequestParam(required = false) String module,
                                          @RequestParam(defaultValue = "20") @Min(1) @Max(200) int limit) {
        return Result.success(trainRecordService.getRecent(module, limit));
    }
}
