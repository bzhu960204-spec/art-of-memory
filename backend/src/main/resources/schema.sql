CREATE TABLE IF NOT EXISTS pao_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    number_string VARCHAR(2) NOT NULL UNIQUE,
    person VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    object VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS object_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    number_string VARCHAR(2) NOT NULL UNIQUE,
    object_name VARCHAR(100) NOT NULL,
    hint VARCHAR(255),
    weight INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS train_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    module_type VARCHAR(30) NOT NULL,
    duration_seconds INT NOT NULL,
    accuracy_rate DOUBLE NOT NULL,
    avg_response_ms INT,
    total_items INT NOT NULL,
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wrong_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    module_type VARCHAR(30) NOT NULL,
    item_content VARCHAR(255) NOT NULL,
    error_count INT DEFAULT 1,
    last_failed_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS words (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    word VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS palace_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(50),
    file_size BIGINT,
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
