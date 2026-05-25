package com.memory.controller;

import com.memory.common.Result;
import com.memory.entity.TrainRecord;
import com.memory.service.TrainRecordService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/records")
public class TrainRecordController {

    private final TrainRecordService trainRecordService;

    public TrainRecordController(TrainRecordService trainRecordService) {
        this.trainRecordService = trainRecordService;
    }

    @PostMapping("/save")
    public Result<TrainRecord> save(@RequestBody TrainRecord record) {
        return Result.success(trainRecordService.save(record));
    }

    @GetMapping("/list")
    public Result<List<TrainRecord>> list(@RequestParam(required = false) String module) {
        if (module != null && !module.isEmpty()) {
            return Result.success(trainRecordService.getByModule(module));
        }
        return Result.success(trainRecordService.getRecent());
    }
}
