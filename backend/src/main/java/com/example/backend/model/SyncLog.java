package com.example.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "sync_logs")
@Data
@NoArgsConstructor
public class SyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime executionTime;
    private String schedulerName;
    private String status;
    private Integer recordsSynced;
    private String syncTokenUsed;
    
    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    public SyncLog(String schedulerName, String status, Integer recordsSynced, String syncTokenUsed, String errorMessage) {
        this.executionTime = LocalDateTime.now();
        this.schedulerName = schedulerName;
        this.status = status;
        this.recordsSynced = recordsSynced;
        this.syncTokenUsed = syncTokenUsed;
        this.errorMessage = errorMessage;
    }
}