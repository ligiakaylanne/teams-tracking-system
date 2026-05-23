package com.example.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
public class GpsDataDto {
    
    @JsonProperty("agentId")
    private String agentRegisterId;
    
    private Double latitude;
    private Double longitude;
    
    @JsonProperty("lastSeen")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    private LocalDateTime timestamp; 
}