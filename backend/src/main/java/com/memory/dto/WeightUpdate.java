package com.memory.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** Relative weight change for one object code; the resulting weight is clamped to 1..10. */
public record WeightUpdate(
        @NotNull @Pattern(regexp = "\\d{2}") String numberString,
        @Min(-100) @Max(100) int delta
) {
}
