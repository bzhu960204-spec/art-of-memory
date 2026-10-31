package com.memory.dto;

import jakarta.validation.constraints.Size;

/** Bulk import entry; entries whose number does not exist are ignored. */
public record ObjectImportItem(
        String numberString,
        @Size(max = 100) String objectName,
        @Size(max = 255) String hint
) {
}
