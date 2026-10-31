package com.memory.dto;

import jakarta.validation.constraints.Size;

/** Partial update of an object code; null fields are left unchanged. */
public record ObjectUpdateRequest(
        @Size(min = 1, max = 100) String objectName,
        @Size(max = 255) String hint
) {
}
