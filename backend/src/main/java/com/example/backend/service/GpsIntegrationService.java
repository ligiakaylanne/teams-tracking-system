package com.example.backend.service;

import com.example.backend.dto.ApiResponseDto;
import com.example.backend.dto.GpsDataDto;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.List;

@Service
public class GpsIntegrationService {

    private final WebClient webClient;
    private static final String API_KEY = "m4a_9d7f2c1ab84e6f03b2c91d5aa77e4c6f8b1d2e3f4a5b6c7";
    private static final int MAX_PAGES = 20; // proteção contra loop infinito

    public GpsIntegrationService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://desafio-media.onrender.com/api")
                .build();
    }

    private Mono<ApiResponseDto> fetchPage(String token, Integer page) {
        return this.webClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder.path("/v1/locations")
                            .queryParam("token", token);
                    if (page != null) {
                        builder.queryParam("page", page);
                    }
                    return builder.build();
                })
                .header("X-API-Key", API_KEY)
                .retrieve()
                .bodyToMono(ApiResponseDto.class)
                .retryWhen(
                        Retry.backoff(3, Duration.ofSeconds(2))
                                .filter(throwable -> {
                                    if (throwable instanceof WebClientResponseException ex) {
                                        int status = ex.getStatusCode().value();
                                        return status == 503 || status == 429;
                                    }
                                    return false;
                                })
                )
                .onErrorResume(ex -> {
                    System.err.println("[GPS] Erro ao buscar página " + page + ": " + ex.getMessage());
                    return Mono.empty();
                });
    }


    public Flux<GpsDataDto> fetchAllPages(String syncToken) {
        return fetchPagesRecursive(syncToken, 1, MAX_PAGES);
    }

    private Flux<GpsDataDto> fetchPagesRecursive(String token, int currentPage, int remaining) {
        if (remaining <= 0) {
            System.out.println("[GPS] Limite de " + MAX_PAGES + " páginas atingido. Interrompendo paginação.");
            return Flux.empty();
        }

        return fetchPage(token, currentPage)
                .flatMapMany(response -> {
                    if (response == null || response.getData() == null || response.getData().isEmpty()) {
                        return Flux.empty();
                    }

                    List<GpsDataDto> currentData = response.getData();
                    System.out.println("[GPS] Página " + currentPage + " recebida com " + currentData.size() + " registros.");

                    Flux<GpsDataDto> currentFlux = Flux.fromIterable(currentData);

                    boolean hasMore = Boolean.TRUE.equals(response.getHasMore());
                    String nextToken = response.getNextSyncToken();

                    if (hasMore && nextToken != null && !nextToken.isBlank()) {
                        return currentFlux.concatWith(
                                fetchPagesRecursive(nextToken, currentPage + 1, remaining - 1)
                        );
                    }

                    return currentFlux;
                });
    }


    public Mono<ApiResponseDto> fetchGpsData(String syncToken) {
        return fetchPage(syncToken, null);
    }
}