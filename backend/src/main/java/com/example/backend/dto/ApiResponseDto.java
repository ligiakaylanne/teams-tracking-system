package com.example.backend.dto;

import lombok.Data;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ApiResponseDto {
    private List<GpsDataDto> data;
    private String nextSyncToken;
    private Boolean hasMore;
}