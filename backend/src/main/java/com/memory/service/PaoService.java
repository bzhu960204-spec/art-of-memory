package com.memory.service;

import com.memory.entity.PaoCode;
import com.memory.entity.WrongItem;
import com.memory.repository.PaoCodeRepository;
import com.memory.repository.WrongItemRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PaoService {

    private final PaoCodeRepository paoCodeRepository;
    private final WrongItemRepository wrongItemRepository;

    public PaoService(PaoCodeRepository paoCodeRepository, WrongItemRepository wrongItemRepository) {
        this.paoCodeRepository = paoCodeRepository;
        this.wrongItemRepository = wrongItemRepository;
    }

    public List<PaoCode> getRandomCards(int limit) {
        return paoCodeRepository.findRandom(limit);
    }

    public void processReview(List<ReviewItem> reviewItems) {
        for (ReviewItem item : reviewItems) {
            if (item.getRating() >= 2) {
                Optional<WrongItem> existing = wrongItemRepository
                        .findByModuleTypeAndItemContent("PAO", item.getNumberString());
                if (existing.isPresent()) {
                    WrongItem wrongItem = existing.get();
                    wrongItem.setErrorCount(wrongItem.getErrorCount() + 1);
                    wrongItem.setLastFailedTime(LocalDateTime.now());
                    wrongItemRepository.save(wrongItem);
                } else {
                    WrongItem wrongItem = new WrongItem();
                    wrongItem.setModuleType("PAO");
                    wrongItem.setItemContent(item.getNumberString());
                    wrongItem.setErrorCount(1);
                    wrongItemRepository.save(wrongItem);
                }
            }
        }
    }

    public static class ReviewItem {
        private String numberString;
        private int rating;
        private long responseMs;

        public String getNumberString() { return numberString; }
        public void setNumberString(String numberString) { this.numberString = numberString; }
        public int getRating() { return rating; }
        public void setRating(int rating) { this.rating = rating; }
        public long getResponseMs() { return responseMs; }
        public void setResponseMs(long responseMs) { this.responseMs = responseMs; }
    }
}
