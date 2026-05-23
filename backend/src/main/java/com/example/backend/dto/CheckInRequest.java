package com.example.backend.dto;

public record CheckInRequest(
        Double latitude,
        Double longitude
) {
}