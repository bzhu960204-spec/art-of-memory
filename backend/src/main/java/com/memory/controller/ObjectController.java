package com.memory.controller;

import com.memory.common.Result;
import com.memory.dto.ObjectImportItem;
import com.memory.dto.ObjectUpdateRequest;
import com.memory.dto.ReviewItem;
import com.memory.dto.WeightUpdate;
import com.memory.entity.ObjectCode;
import com.memory.service.ObjectService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/objects")
@Validated
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
    public Result<ObjectCode> update(@PathVariable @Pattern(regexp = "\\d{2}") String numberString,
                                     @Valid @RequestBody ObjectUpdateRequest req) {
        return Result.success(objectService.update(numberString, req));
    }

    @PostMapping("/weights")
    public Result<String> batchUpdateWeights(@RequestBody List<@Valid WeightUpdate> updates) {
        objectService.batchUpdateWeights(updates);
        return Result.success("Weights updated");
    }

    @PostMapping("/weights/reset")
    public Result<String> resetWeights() {
        objectService.resetWeights();
        return Result.success("Weights reset");
    }

    @PostMapping("/review")
    public Result<String> submitReview(@RequestBody List<@Valid ReviewItem> items) {
        objectService.processReview(items);
        return Result.success("Review saved");
    }

    @PostMapping("/import")
    public Result<String> batchImport(@RequestBody List<@Valid ObjectImportItem> items) {
        int count = objectService.batchImport(items);
        return Result.success("Imported " + count + " items");
    }
}
