package com.example.backend.repository;

import com.example.backend.model.SyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SyncLogRepository extends JpaRepository<SyncLog, Long> {
    
    @Query(value = "SELECT s.sync_token_used FROM sync_logs s WHERE s.status = 'SUCESSO' AND s.sync_token_used IS NOT NULL ORDER BY s.execution_time DESC LIMIT 1", nativeQuery = true)
    Optional<String> findLastValidSyncToken();

    List<SyncLog> findAllByOrderByExecutionTimeDesc();
}