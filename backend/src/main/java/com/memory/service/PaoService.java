package com.memory.service;

import com.memory.common.ModuleType;
import com.memory.dto.ReviewItem;
import com.memory.entity.PaoCode;
import com.memory.repository.PaoCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class PaoService {

    private final PaoCodeRepository paoCodeRepository;
    private final WrongItemService wrongItemService;
    private final SrsService srsService;

    public PaoService(PaoCodeRepository paoCodeRepository, WrongItemService wrongItemService, SrsService srsService) {
        this.paoCodeRepository = paoCodeRepository;
        this.wrongItemService = wrongItemService;
        this.srsService = srsService;
    }

    @Transactional(readOnly = true)
    public List<PaoCode> getRandomCards(int limit) {
        return paoCodeRepository.findRandom(limit);
    }

    /** Cards due for spaced-repetition review first (shuffled), topped up with random cards. */
    @Transactional(readOnly = true)
    public List<PaoCode> getSessionCards(int limit) {
        List<String> dueKeys = srsService.dueItems(ModuleType.PAO, LocalDate.now(), limit);
        List<PaoCode> session = new ArrayList<>(paoCodeRepository.findByNumberStringIn(dueKeys));
        Collections.shuffle(session);

        Set<String> taken = new HashSet<>(dueKeys);
        for (PaoCode code : paoCodeRepository.findRandom(limit + dueKeys.size())) {
            if (session.size() >= limit) break;
            if (taken.add(code.getNumberString())) session.add(code);
        }
        return session;
    }

    @Transactional
    public void processReview(List<ReviewItem> items) {
        wrongItemService.recordReview(ModuleType.PAO, items);
        srsService.recordReview(ModuleType.PAO, items, LocalDate.now());
    }
}
