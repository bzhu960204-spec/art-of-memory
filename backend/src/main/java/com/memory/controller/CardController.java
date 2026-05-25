package com.memory.controller;

import com.memory.common.Result;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/cards")
public class CardController {

    private static final String[] SUITS = {"♠", "♥", "♦", "♣"};
    private static final String[] RANKS = {"A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"};

    @GetMapping("/shuffle")
    public Result<List<Map<String, String>>> shuffle() {
        List<Map<String, String>> deck = new ArrayList<>(52);
        for (String suit : SUITS) {
            for (String rank : RANKS) {
                Map<String, String> card = new HashMap<>();
                card.put("suit", suit);
                card.put("rank", rank);
                card.put("id", suit + rank);
                deck.add(card);
            }
        }
        Collections.shuffle(deck);
        return Result.success(deck);
    }
}
