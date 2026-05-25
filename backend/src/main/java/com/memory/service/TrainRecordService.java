package com.memory.service;

import com.memory.entity.TrainRecord;
import com.memory.repository.TrainRecordRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TrainRecordService {

    private final TrainRecordRepository trainRecordRepository;

    public TrainRecordService(TrainRecordRepository trainRecordRepository) {
        this.trainRecordRepository = trainRecordRepository;
    }

    public TrainRecord save(TrainRecord record) {
        return trainRecordRepository.save(record);
    }

    public List<TrainRecord> getByModule(String moduleType) {
        return trainRecordRepository.findByModuleTypeOrderByCreatedTimeDesc(moduleType);
    }

    public List<TrainRecord> getRecent() {
        return trainRecordRepository.findTop20ByOrderByCreatedTimeDesc();
    }
}
