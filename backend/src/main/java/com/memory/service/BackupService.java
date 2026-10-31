package com.memory.service;

import com.memory.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/** Builds a JSON-serialisable snapshot of all user data (uploaded image files themselves are not included). */
@Service
public class BackupService {

    static final int FORMAT_VERSION = 1;

    private final TrainRecordRepository trainRecords;
    private final WrongItemRepository wrongItems;
    private final ObjectCodeRepository objectCodes;
    private final PaoCodeRepository paoCodes;
    private final WordRepository words;
    private final SrsCardRepository srsCards;
    private final AchievementRepository achievements;
    private final StreakRecordRepository streaks;
    private final DailyChallengeRepository dailyChallenges;
    private final PalaceImageRepository palaceImages;

    public BackupService(TrainRecordRepository trainRecords, WrongItemRepository wrongItems,
                         ObjectCodeRepository objectCodes, PaoCodeRepository paoCodes, WordRepository words,
                         SrsCardRepository srsCards, AchievementRepository achievements,
                         StreakRecordRepository streaks, DailyChallengeRepository dailyChallenges,
                         PalaceImageRepository palaceImages) {
        this.trainRecords = trainRecords;
        this.wrongItems = wrongItems;
        this.objectCodes = objectCodes;
        this.paoCodes = paoCodes;
        this.words = words;
        this.srsCards = srsCards;
        this.achievements = achievements;
        this.streaks = streaks;
        this.dailyChallenges = dailyChallenges;
        this.palaceImages = palaceImages;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> export() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("formatVersion", FORMAT_VERSION);
        data.put("exportedAt", LocalDateTime.now());
        data.put("trainRecords", trainRecords.findAll());
        data.put("wrongItems", wrongItems.findAll());
        data.put("objectCodes", objectCodes.findAllByOrderByNumberStringAsc());
        data.put("paoCodes", paoCodes.findAll());
        data.put("words", words.findAll());
        data.put("srsCards", srsCards.findAll());
        data.put("achievements", achievements.findAll());
        data.put("streak", streaks.findFirstByOrderByIdAsc().orElse(null));
        data.put("dailyChallenges", dailyChallenges.findAll());
        data.put("palaceImages", palaceImages.findAll());
        return data;
    }
}
