package com.example.backend.service;

import com.example.backend.dto.GpsDataDto;
import com.example.backend.model.Agent;
import com.example.backend.model.RouteHistory;
import com.example.backend.repository.AgentRepository;
import com.example.backend.repository.RouteHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgentServiceTest {

    @Mock
    private AgentRepository agentRepository;

    @Mock
    private RouteHistoryRepository routeHistoryRepository;

    @InjectMocks
    private AgentService agentService;

    private GpsDataDto validGpsData;
    private Agent existingAgent;

    @BeforeEach
    void setUp() {
        validGpsData = new GpsDataDto();
        validGpsData.setAgentRegisterId("AGT-001");
        validGpsData.setLatitude(-23.5505);
        validGpsData.setLongitude(-46.6333);
        validGpsData.setTimestamp(LocalDateTime.now());

        existingAgent = new Agent();
        existingAgent.setId(1L);
        existingAgent.setRegisterId("AGT-001");
        existingAgent.setName("João Silva");
        existingAgent.setStatus("ATIVO");
        existingAgent.setLastLatitude(-23.5500);
        existingAgent.setLastLongitude(-46.6330);
    }

    @Test
    @DisplayName("Deve criar novo agente quando registerId não existe")
    void devecriarNovoAgenteQuandoNaoExiste() {
        when(agentRepository.findByRegisterId("AGT-001")).thenReturn(Optional.empty());
        when(agentRepository.save(any(Agent.class))).thenReturn(existingAgent);
        when(routeHistoryRepository.existsByAgentRegisterIdAndLatitudeAndLongitudeAndTimestamp(
                any(), any(), any(), any())).thenReturn(false);

        agentService.processGpsLocation(validGpsData);

        verify(agentRepository, times(2)).save(any(Agent.class));
    }

    @Test
    @DisplayName("Deve atualizar posição de agente existente")
    void deveAtualizarPosicaoDeAgenteExistente() {
        when(agentRepository.findByRegisterId("AGT-001")).thenReturn(Optional.of(existingAgent));
        when(agentRepository.save(any(Agent.class))).thenReturn(existingAgent);
        when(routeHistoryRepository.existsByAgentRegisterIdAndLatitudeAndLongitudeAndTimestamp(
                any(), any(), any(), any())).thenReturn(false);

        agentService.processGpsLocation(validGpsData);

        verify(agentRepository, times(1)).save(any(Agent.class));
        verify(routeHistoryRepository, times(1)).save(any(RouteHistory.class));
    }

    @Test
    @DisplayName("Deve ignorar ponto GPS com distância absurda (> 500 km)")
    void deveIgnorarPontoGpsComDistanciaAbsurda() {
        existingAgent.setLastLatitude(51.5074);  // Londres
        existingAgent.setLastLongitude(-0.1278);

        validGpsData.setLatitude(-23.5505);       // São Paulo
        validGpsData.setLongitude(-46.6333);

        when(agentRepository.findByRegisterId("AGT-001")).thenReturn(Optional.of(existingAgent));

        agentService.processGpsLocation(validGpsData);

        // Não deve salvar ponto inválido
        verify(agentRepository, never()).save(any(Agent.class));
        verify(routeHistoryRepository, never()).save(any(RouteHistory.class));
    }

    @Test
    @DisplayName("Deve ignorar dados GPS com campos nulos")
    void deveIgnorarDadosGpsNulos() {
        GpsDataDto nullData = new GpsDataDto();
        nullData.setAgentRegisterId(null);

        agentService.processGpsLocation(nullData);

        verify(agentRepository, never()).findByRegisterId(any());
    }

    @Test
    @DisplayName("Deve ignorar ponto duplicado (idempotência)")
    void deveIgnorarPontoDuplicado() {
        when(agentRepository.findByRegisterId("AGT-001")).thenReturn(Optional.of(existingAgent));
        when(routeHistoryRepository.existsByAgentRegisterIdAndLatitudeAndLongitudeAndTimestamp(
                any(), any(), any(), any())).thenReturn(true);

        agentService.processGpsLocation(validGpsData);

        verify(routeHistoryRepository, never()).save(any(RouteHistory.class));
    }
}