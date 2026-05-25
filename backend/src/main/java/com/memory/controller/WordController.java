package com.memory.controller;

import com.memory.common.Result;
import com.memory.service.WordService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/words")
public class WordController {

    private final WordService wordService;

    public WordController(WordService wordService) {
        this.wordService = wordService;
    }

    @GetMapping("/random")
    public Result<List<String>> getRandomWords(@RequestParam(defaultValue = "20") int limit) {
        return Result.success(wordService.getRandomWords(limit));
    }
}
