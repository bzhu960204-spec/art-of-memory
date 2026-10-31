package com.memory.dto;

import com.memory.common.ModuleType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for saving a finished training session.
 * Deliberately excludes id / createdTime so clients cannot overwrite existing records.
 */
public record TrainRecordRequest(
        @NotNull ModuleType moduleType,
        @NotNull @Min(0) Integer durationSeconds,
        @NotNull Double accuracyRate,
        @Min(0) Integer avgResponseMs,
        @NotNull @Min(0) Integer totalItems
) {
}
