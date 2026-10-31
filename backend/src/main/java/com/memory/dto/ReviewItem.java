package com.memory.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** Result of reviewing one two-digit code. rating: 1 = proficient, 2 = rusty, 3 = unknown. */
public record ReviewItem(
        @NotNull @Pattern(regexp = "\\d{2}") String numberString,
        @Min(1) @Max(3) int rating,
        @Min(0) long responseMs
) {
    public boolean failed() {
        return rating >= 2;
    }
}
