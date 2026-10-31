package com.memory.service;

import com.memory.common.ModuleType;
import com.memory.dto.ReviewItem;
import com.memory.entity.SrsCard;
import com.memory.entity.WrongItem;
import com.memory.repository.SrsCardRepository;
import com.memory.repository.WrongItemRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SrsServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 31);

    @Autowired
    private SrsService srsService;
    @Autowired
    private PaoService paoService;
    @Autowired
    private SrsCardRepository srsRepository;
    @Autowired
    private WrongItemService wrongItemService;
    @Autowired
    private WrongItemRepository wrongItemRepository;

    // ---- SM-2 maths ----

    @Test
    void correctAnswersGrowTheIntervalOneSixThenByEase() {
        SrsCard card = newCard();

        SrsService.schedule(card, 5, TODAY);
        assertThat(card.getIntervalDays()).isEqualTo(1);
        SrsService.schedule(card, 5, TODAY);
        assertThat(card.getIntervalDays()).isEqualTo(6);
        SrsService.schedule(card, 5, TODAY);

        assertThat(card.getRepetitions()).isEqualTo(3);
        assertThat(card.getEaseFactor()).isCloseTo(2.8, within(1e-9));
        assertThat(card.getIntervalDays()).isEqualTo(16); // round(6 * 2.7)
        assertThat(card.getDueDate()).isEqualTo(TODAY.plusDays(16));
    }

    @Test
    void failureResetsRepetitionsAndLowersEaseButNotBelowMinimum() {
        SrsCard card = newCard();
        SrsService.schedule(card, 5, TODAY);
        SrsService.schedule(card, 5, TODAY);

        for (int i = 0; i < 10; i++) SrsService.schedule(card, 1, TODAY);

        assertThat(card.getRepetitions()).isZero();
        assertThat(card.getIntervalDays()).isEqualTo(1);
        assertThat(card.getEaseFactor()).isEqualTo(SrsService.MIN_EASE);
        assertThat(card.getDueDate()).isEqualTo(TODAY.plusDays(1));
    }

    @Test
    void ratingsMapToSm2Quality() {
        assertThat(SrsService.qualityOf(1)).isEqualTo(5);
        assertThat(SrsService.qualityOf(2)).isEqualTo(3);
        assertThat(SrsService.qualityOf(3)).isEqualTo(1);
    }

    // ---- persistence & sessions ----

    @Test
    void onlyTheFirstRatingOfARequeuedCardCounts() {
        srsService.recordReview(ModuleType.OBJECT, List.of(review("12", 3), review("12", 1)), TODAY);

        SrsCard card = srsRepository.findByModuleTypeAndItemKeyIn("OBJECT", List.of("12")).get(0);
        assertThat(card.getRepetitions()).isZero();
        assertThat(card.getDueDate()).isEqualTo(TODAY.plusDays(1));
    }

    @Test
    void dueItemsAreMostOverdueFirstAndExcludeFutureCards() {
        srsService.recordReview(ModuleType.PAO, List.of(review("01", 3)), TODAY.minusDays(5));
        srsService.recordReview(ModuleType.PAO, List.of(review("02", 3)), TODAY.minusDays(2));
        srsService.recordReview(ModuleType.PAO, List.of(review("03", 1)), TODAY);

        assertThat(srsService.dueItems(ModuleType.PAO, TODAY, 10)).containsExactly("01", "02");
        assertThat(srsService.stats(ModuleType.PAO, TODAY)).isEqualTo(new SrsService.SrsStats(2, 3));
    }

    @Test
    void paoSessionStartsWithDueCardsAndIsFilledUpWithoutDuplicates() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        srsService.recordReview(ModuleType.PAO, List.of(review("07", 3), review("08", 3)), yesterday.minusDays(1));

        var session = paoService.getSessionCards(20);

        assertThat(session).hasSize(20);
        assertThat(session.subList(0, 2)).extracting("numberString").containsExactlyInAnyOrder("07", "08");
        assertThat(session).extracting("numberString").doesNotHaveDuplicates();
    }

    // ---- wrong items ----

    @Test
    void wrongItemsDecayWhenAnsweredCorrectlyAndDisappearAtZero() {
        wrongItemService.recordReview(ModuleType.OBJECT, List.of(review("20", 3), review("20", 3), review("21", 2)));
        assertThat(errorCount("20")).isEqualTo(2);

        wrongItemService.recordReview(ModuleType.OBJECT, List.of(review("20", 1), review("21", 1)));

        assertThat(errorCount("20")).isEqualTo(1);
        assertThat(wrongItemRepository.findByModuleTypeAndItemContent("OBJECT", "21")).isEmpty();
    }

    @Test
    void aCardMissedThenCorrectInTheSameSessionDoesNotDecay() {
        wrongItemService.recordReview(ModuleType.OBJECT, List.of(review("30", 3)));

        wrongItemService.recordReview(ModuleType.OBJECT, List.of(review("30", 2), review("30", 1)));

        assertThat(errorCount("30")).isEqualTo(2);
    }

    private int errorCount(String key) {
        return wrongItemRepository.findByModuleTypeAndItemContent("OBJECT", key)
                .map(WrongItem::getErrorCount).orElse(0);
    }

    private static SrsCard newCard() {
        SrsCard card = new SrsCard();
        card.setModuleType("PAO");
        card.setItemKey("00");
        return card;
    }

    private static ReviewItem review(String key, int rating) {
        return new ReviewItem(key, rating, 1000);
    }
}
