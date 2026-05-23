package com.example.backend.controller;

import com.example.backend.model.SyncLog;
import com.example.backend.repository.SyncLogRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/sync-logs")
@CrossOrigin(origins = "http://localhost:4200")
public class SyncLogController {

    private final SyncLogRepository repository;

    public SyncLogController(SyncLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<SyncLog> getAllLogs() {
        return repository.findAllByOrderByExecutionTimeDesc();
    }
}