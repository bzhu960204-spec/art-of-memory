package com.memory.controller;

import com.memory.common.Result;
import com.memory.entity.ObjectCode;
import com.memory.service.ObjectService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/objects")
public class ObjectController {

    private final ObjectService objectService;

    public ObjectController(ObjectService objectService) {
        this.objectService = objectService;
    }

    @GetMapping("/all")
    public Result<List<ObjectCode>> getAll() {
        return Result.success(objectService.getAll());
    }

    @PutMapping("/{numberString}")
    public Result<ObjectCode> update(@PathVariable String numberString,
                                     @RequestBody ObjectService.UpdateRequest req) {
        return Result.success(objectService.update(numberString, req));
    }

    @PostMapping("/weights")
    public Result<String> batchUpdateWeights(@RequestBody List<ObjectService.WeightUpdate> updates) {
        objectService.batchUpdateWeights(updates);
        return Result.success("Weights updated");
    }

    @PostMapping("/weights/reset")
    public Result<String> resetWeights() {
        objectService.resetWeights();
        return Result.success("Weights reset");
    }

    @PostMapping("/review")
    public Result<String> submitReview(@RequestBody List<ObjectService.ReviewItem> items) {
        objectService.processReview(items);
        return Result.success("Review saved");
    }

    @PostMapping("/import")
    public Result<String> batchImport(@RequestBody List<ObjectService.ImportItem> items) {
        int count = objectService.batchImport(items);
        return Result.success("Imported " + count + " items");
    }
}
