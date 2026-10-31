package com.memory.service;

import com.memory.common.BusinessException;
import com.memory.common.ModuleType;
import com.memory.dto.ObjectImportItem;
import com.memory.dto.ObjectUpdateRequest;
import com.memory.dto.ReviewItem;
import com.memory.dto.WeightUpdate;
import com.memory.entity.ObjectCode;
import com.memory.repository.ObjectCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ObjectService {

    static final int MIN_WEIGHT = 1;
    static final int MAX_WEIGHT = 10;

    private final ObjectCodeRepository objectCodeRepository;
    private final WrongItemService wrongItemService;
    private final SrsService srsService;

    public ObjectService(ObjectCodeRepository objectCodeRepository, WrongItemService wrongItemService,
                         SrsService srsService) {
        this.objectCodeRepository = objectCodeRepository;
        this.wrongItemService = wrongItemService;
        this.srsService = srsService;
    }

    @Transactional(readOnly = true)
    public List<ObjectCode> getAll() {
        return objectCodeRepository.findAllByOrderByNumberStringAsc();
    }

    @Transactional
    public ObjectCode update(String numberString, ObjectUpdateRequest req) {
        ObjectCode code = objectCodeRepository.findByNumberString(numberString)
                .orElseThrow(() -> BusinessException.notFound("编码不存在: " + numberString));
        if (req.objectName() != null) code.setObjectName(req.objectName().trim());
        if (req.hint() != null) code.setHint(req.hint().trim());
        return objectCodeRepository.save(code);
    }

    @Transactional
    public void batchUpdateWeights(List<WeightUpdate> updates) {
        Map<String, ObjectCode> codes = byNumber(updates.stream().map(WeightUpdate::numberString).toList());
        for (WeightUpdate u : updates) {
            ObjectCode code = codes.get(u.numberString());
            if (code == null) continue;
            code.setWeight(Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, code.getWeight() + u.delta())));
        }
        objectCodeRepository.saveAll(codes.values());
    }

    @Transactional
    public void resetWeights() {
        List<ObjectCode> all = objectCodeRepository.findAll();
        all.forEach(c -> c.setWeight(MIN_WEIGHT));
        objectCodeRepository.saveAll(all);
    }

    /** Updates existing codes only; returns the number of updated codes. */
    @Transactional
    public int batchImport(List<ObjectImportItem> items) {
        Map<String, ObjectCode> codes = byNumber(items.stream().map(ObjectImportItem::numberString).toList());
        int updated = 0;
        for (ObjectImportItem item : items) {
            ObjectCode code = codes.get(item.numberString());
            if (code == null) continue;
            if (item.objectName() != null && !item.objectName().isBlank()) {
                code.setObjectName(item.objectName().trim());
            }
            if (item.hint() != null) {
                code.setHint(item.hint().trim());
            }
            updated++;
        }
        objectCodeRepository.saveAll(codes.values());
        return updated;
    }

    @Transactional
    public void processReview(List<ReviewItem> items) {
        wrongItemService.recordReview(ModuleType.OBJECT, items);
        srsService.recordReview(ModuleType.OBJECT, items, LocalDate.now());
    }

    private Map<String, ObjectCode> byNumber(List<String> numbers) {
        return objectCodeRepository.findAllByNumberStringIn(numbers).stream()
                .collect(Collectors.toMap(ObjectCode::getNumberString, Function.identity()));
    }
}
