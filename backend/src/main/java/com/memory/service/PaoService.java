package com.memory.service;

import com.memory.common.ModuleType;
import com.memory.dto.ReviewItem;
import com.memory.entity.PaoCode;
import com.memory.repository.PaoCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PaoService {

    private final PaoCodeRepository paoCodeRepository;
    private final WrongItemService wrongItemService;

    public PaoService(PaoCodeRepository paoCodeRepository, WrongItemService wrongItemService) {
        this.paoCodeRepository = paoCodeRepository;
        this.wrongItemService = wrongItemService;
    }

    @Transactional(readOnly = true)
    public List<PaoCode> getRandomCards(int limit) {
        return paoCodeRepository.findRandom(limit);
    }

    @Transactional
    public void processReview(List<ReviewItem> items) {
        wrongItemService.recordReview(ModuleType.PAO, items);
    }
}
