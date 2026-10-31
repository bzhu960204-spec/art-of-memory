package com.memory.service;

import com.memory.entity.ObjectCode;
import com.memory.entity.WrongItem;
import com.memory.repository.ObjectCodeRepository;
import com.memory.repository.WrongItemRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ObjectServiceTest {

    @Autowired
    private ObjectService service;
    @Autowired
    private ObjectCodeRepository objectCodeRepository;
    @Autowired
    private WrongItemRepository wrongItemRepository;

    @Test
    void weightsAreClampedBetweenOneAndTen() {
        service.batchUpdateWeights(List.of(weight("01", 100), weight("02", -100)));

        assertThat(code("01").getWeight()).isEqualTo(10);
        assertThat(code("02").getWeight()).isEqualTo(1);
    }

    @Test
    void unknownNumbersAreIgnoredWhenUpdatingWeights() {
        service.batchUpdateWeights(List.of(weight("XX", 3)));

        assertThat(objectCodeRepository.count()).isEqualTo(100);
    }

    @Test
    void resetWeightsSetsEveryCodeBackToOne() {
        service.batchUpdateWeights(List.of(weight("03", 5)));

        service.resetWeights();

        assertThat(objectCodeRepository.findAll()).allMatch(c -> c.getWeight() == 1);
    }

    @Test
    void importUpdatesOnlyExistingCodesAndTrimsValues() {
        int updated = service.batchImport(List.of(
                importItem("05", "  手套 ", " 五指 "),
                importItem("100", "不存在", null)));

        assertThat(updated).isEqualTo(1);
        assertThat(code("05").getObjectName()).isEqualTo("手套");
        assertThat(code("05").getHint()).isEqualTo("五指");
        assertThat(objectCodeRepository.findByNumberString("100")).isEmpty();
    }

    @Test
    void importKeepsExistingNameWhenNewNameIsBlank() {
        String original = code("06").getObjectName();

        service.batchImport(List.of(importItem("06", "  ", null)));

        assertThat(code("06").getObjectName()).isEqualTo(original);
    }

    @Test
    void reviewRecordsWrongItemsForRustyOrUnknownRatings() {
        service.processReview(List.of(review("07", 1), review("08", 2), review("09", 3)));
        service.processReview(List.of(review("08", 3)));

        assertThat(wrongItemRepository.findByModuleTypeAndItemContent("OBJECT", "07")).isEmpty();
        assertThat(wrongItemRepository.findByModuleTypeAndItemContent("OBJECT", "08"))
                .map(WrongItem::getErrorCount).hasValue(2);
        assertThat(wrongItemRepository.findByModuleTypeAndItemContent("OBJECT", "09"))
                .map(WrongItem::getErrorCount).hasValue(1);
    }

    private ObjectCode code(String number) {
        return objectCodeRepository.findByNumberString(number).orElseThrow();
    }

    private static ObjectService.WeightUpdate weight(String number, int delta) {
        ObjectService.WeightUpdate u = new ObjectService.WeightUpdate();
        u.setNumberString(number);
        u.setDelta(delta);
        return u;
    }

    private static ObjectService.ImportItem importItem(String number, String name, String hint) {
        ObjectService.ImportItem i = new ObjectService.ImportItem();
        i.setNumberString(number);
        i.setObjectName(name);
        i.setHint(hint);
        return i;
    }

    private static ObjectService.ReviewItem review(String number, int rating) {
        ObjectService.ReviewItem r = new ObjectService.ReviewItem();
        r.setNumberString(number);
        r.setRating(rating);
        return r;
    }
}
