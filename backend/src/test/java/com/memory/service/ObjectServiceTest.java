package com.memory.service;

import com.memory.common.BusinessException;
import com.memory.dto.ObjectImportItem;
import com.memory.dto.ObjectUpdateRequest;
import com.memory.dto.ReviewItem;
import com.memory.dto.WeightUpdate;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    @Test
    void updateTrimsValuesAndKeepsOmittedFields() {
        String originalHint = code("10").getHint();

        service.update("10", new ObjectUpdateRequest("  棒球 ", null));

        assertThat(code("10").getObjectName()).isEqualTo("棒球");
        assertThat(code("10").getHint()).isEqualTo(originalHint);
    }

    @Test
    void updatingUnknownCodeIsNotFound() {
        assertThatThrownBy(() -> service.update("XX", new ObjectUpdateRequest("x", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("XX");
    }

    @Test
    void repeatedWeightUpdatesForSameCodeAccumulate() {
        service.batchUpdateWeights(List.of(weight("11", 2), weight("11", 3)));

        assertThat(code("11").getWeight()).isEqualTo(6);
    }

    private static WeightUpdate weight(String number, int delta) {
        return new WeightUpdate(number, delta);
    }

    private static ObjectImportItem importItem(String number, String name, String hint) {
        return new ObjectImportItem(number, name, hint);
    }

    private static ReviewItem review(String number, int rating) {
        return new ReviewItem(number, rating, 1000);
    }
}
