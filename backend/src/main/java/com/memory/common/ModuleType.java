package com.memory.common;

import java.util.List;

/**
 * All training modules that can produce a {@link com.memory.entity.TrainRecord}.
 * Stored in the database by {@link #name()}.
 */
public enum ModuleType {
    PAO("数字编码"),
    OBJECT("物品编码"),
    WORDS("随机词组"),
    CARDS("扑克记忆"),
    NUMBERS("数字马拉松"),
    NAMES("人脸名字"),
    TEXT("文章段落"),
    BINARY("二进制"),
    DATES("历史日期");

    // Order must stay stable so that past dates keep resolving to the same module
    private static final List<ModuleType> DAILY_CHALLENGE_ROTATION = List.of(NUMBERS, WORDS, CARDS, PAO, OBJECT);

    private final String displayName;

    ModuleType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    /** Modules rotated through by the daily challenge, in rotation order. */
    public static List<ModuleType> dailyChallengeRotation() {
        return DAILY_CHALLENGE_ROTATION;
    }
}
