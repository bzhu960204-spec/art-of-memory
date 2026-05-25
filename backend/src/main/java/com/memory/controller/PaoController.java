package com.memory.controller;

import com.memory.common.Result;
import com.memory.entity.PaoCode;
import com.memory.service.PaoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pao")
public class PaoController {

    private final PaoService paoService;

    public PaoController(PaoService paoService) {
        this.paoService = paoService;
    }

    @GetMapping("/random")
    public Result<List<PaoCode>> getRandomCards(@RequestParam(defaultValue = "20") int limit) {
        return Result.success(paoService.getRandomCards(limit));
    }

    @PostMapping("/review")
    public Result<String> submitReview(@RequestBody List<PaoService.ReviewItem> reviewItems) {
        paoService.processReview(reviewItems);
        return Result.success("Review saved");
    }
}
