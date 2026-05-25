package com.memory.service;

import com.memory.entity.Word;
import com.memory.repository.WordRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class WordService {

    private final WordRepository wordRepository;

    public WordService(WordRepository wordRepository) {
        this.wordRepository = wordRepository;
    }

    public List<String> getRandomWords(int limit) {
        return wordRepository.findRandom(limit)
                .stream()
                .map(Word::getWord)
                .collect(Collectors.toList());
    }
}
