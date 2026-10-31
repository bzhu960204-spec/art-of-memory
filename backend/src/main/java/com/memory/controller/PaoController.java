package com.memory.controller;

import com.memory.common.Result;
import com.memory.dto.ReviewItem;
import com.memory.entity.PaoCode;
import com.memory.service.PaoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pao")
@Validated
public class PaoController {

    private final PaoService paoService;

    public PaoController(PaoService paoService) {
        this.paoService = paoService;
    }

    @GetMapping("/random")
    public Result<List<PaoCode>> getRandomCards(@RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return Result.success(paoService.getRandomCards(limit));
    }

    /** Training session: cards due for spaced-repetition review first, then random cards. */
    @GetMapping("/session")
    public Result<List<PaoCode>> getSessionCards(@RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return Result.success(paoService.getSessionCards(limit));
    }

    @PostMapping("/review")
    public Result<String> submitReview(@RequestBody List<@Valid ReviewItem> reviewItems) {
        paoService.processReview(reviewItems);
        return Result.success("Review saved");
    }
}
