package com.memory.service;

import com.memory.entity.ObjectCode;
import com.memory.entity.WrongItem;
import com.memory.repository.ObjectCodeRepository;
import com.memory.repository.WrongItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ObjectService {

    private final ObjectCodeRepository objectCodeRepository;
    private final WrongItemRepository wrongItemRepository;

    public ObjectService(ObjectCodeRepository objectCodeRepository,
                         WrongItemRepository wrongItemRepository) {
        this.objectCodeRepository = objectCodeRepository;
        this.wrongItemRepository = wrongItemRepository;
    }

    public List<ObjectCode> getAll() {
        return objectCodeRepository.findAllByOrderByNumberStringAsc();
    }

    @Transactional
    public ObjectCode update(String numberString, UpdateRequest req) {
        ObjectCode code = objectCodeRepository.findByNumberString(numberString)
                .orElseThrow(() -> new IllegalArgumentException("Not found: " + numberString));
        if (req.getObjectName() != null) code.setObjectName(req.getObjectName());
        if (req.getHint() != null) code.setHint(req.getHint());
        return objectCodeRepository.save(code);
    }

    @Transactional
    public void batchUpdateWeights(List<WeightUpdate> updates) {
        for (WeightUpdate u : updates) {
            objectCodeRepository.findByNumberString(u.getNumberString()).ifPresent(code -> {
                int newWeight = Math.max(1, Math.min(10, code.getWeight() + u.getDelta()));
                code.setWeight(newWeight);
                objectCodeRepository.save(code);
            });
        }
    }

    @Transactional
    public void resetWeights() {
        List<ObjectCode> all = objectCodeRepository.findAll();
        all.forEach(c -> c.setWeight(1));
        objectCodeRepository.saveAll(all);
    }

    @Transactional
    public int batchImport(List<ImportItem> items) {
        int updated = 0;
        for (ImportItem item : items) {
            Optional<ObjectCode> opt = objectCodeRepository.findByNumberString(item.getNumberString());
            if (opt.isPresent()) {
                ObjectCode code = opt.get();
                if (item.getObjectName() != null && !item.getObjectName().isBlank()) {
                    code.setObjectName(item.getObjectName().trim());
                }
                if (item.getHint() != null) {
                    code.setHint(item.getHint().trim());
                }
                objectCodeRepository.save(code);
                updated++;
            }
        }
        return updated;
    }

    @Transactional
    public void processReview(List<ReviewItem> items) {
        for (ReviewItem item : items) {
            if (item.getRating() >= 2) {
                Optional<WrongItem> existing = wrongItemRepository
                        .findByModuleTypeAndItemContent("OBJECT", item.getNumberString());
                if (existing.isPresent()) {
                    WrongItem w = existing.get();
                    w.setErrorCount(w.getErrorCount() + 1);
                    w.setLastFailedTime(LocalDateTime.now());
                    wrongItemRepository.save(w);
                } else {
                    WrongItem w = new WrongItem();
                    w.setModuleType("OBJECT");
                    w.setItemContent(item.getNumberString());
                    w.setErrorCount(1);
                    wrongItemRepository.save(w);
                }
            }
        }
    }

    // ---- Inner DTOs ----

    public static class UpdateRequest {
        private String objectName;
        private String hint;
        public String getObjectName() { return objectName; }
        public void setObjectName(String objectName) { this.objectName = objectName; }
        public String getHint() { return hint; }
        public void setHint(String hint) { this.hint = hint; }
    }

    public static class WeightUpdate {
        private String numberString;
        private int delta;
        public String getNumberString() { return numberString; }
        public void setNumberString(String numberString) { this.numberString = numberString; }
        public int getDelta() { return delta; }
        public void setDelta(int delta) { this.delta = delta; }
    }

    public static class ImportItem {
        private String numberString;
        private String objectName;
        private String hint;
        public String getNumberString() { return numberString; }
        public void setNumberString(String numberString) { this.numberString = numberString; }
        public String getObjectName() { return objectName; }
        public void setObjectName(String objectName) { this.objectName = objectName; }
        public String getHint() { return hint; }
        public void setHint(String hint) { this.hint = hint; }
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
