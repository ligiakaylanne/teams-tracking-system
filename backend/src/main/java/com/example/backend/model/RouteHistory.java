package com.example.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "route_histories")
@Data
@NoArgsConstructor
public class RouteHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String agentRegisterId;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    private Double distanceTraveledKm; 

    public RouteHistory(String agentRegisterId, Double latitude, Double longitude, LocalDateTime timestamp, Double distanceTraveledKm) {
        this.agentRegisterId = agentRegisterId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = timestamp;
        this.distanceTraveledKm = distanceTraveledKm;
    }
}