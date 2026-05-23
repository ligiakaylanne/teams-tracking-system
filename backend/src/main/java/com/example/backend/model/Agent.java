package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "agents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Agent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String registerId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String status;

    private LocalDateTime lastCheckIn;
    private Double lastLatitude;
    private Double lastLongitude;
}