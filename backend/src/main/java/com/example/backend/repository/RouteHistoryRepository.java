package com.example.backend.repository;

import com.example.backend.model.RouteHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RouteHistoryRepository extends JpaRepository<RouteHistory, Long> {

    List<RouteHistory> findByAgentRegisterIdOrderByTimestampDesc(
            String agentRegisterId
    );

    boolean existsByAgentRegisterIdAndLatitudeAndLongitudeAndTimestamp(
            String agentRegisterId,
            Double latitude,
            Double longitude,
            LocalDateTime timestamp
    );
}