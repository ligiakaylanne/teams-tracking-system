package com.example.backend.service;

import com.example.backend.dto.GpsDataDto;
import com.example.backend.model.Agent;
import com.example.backend.model.RouteHistory;
import com.example.backend.repository.AgentRepository;
import com.example.backend.repository.RouteHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AgentService {

    private final AgentRepository agentRepository;
    private final RouteHistoryRepository routeHistoryRepository;

    public AgentService(AgentRepository agentRepository, RouteHistoryRepository routeHistoryRepository) {
        this.agentRepository = agentRepository;
        this.routeHistoryRepository = routeHistoryRepository;
    }

    @Transactional
    public void processGpsLocation(GpsDataDto gpsData) {
        System.out.println("DEBUG: Recebido agente: " + gpsData.getAgentRegisterId() + " | Lat: " + gpsData.getLatitude());

        if (gpsData.getAgentRegisterId() == null || gpsData.getLatitude() == null || gpsData.getLongitude() == null) {
            return;
        }

        Agent agent = agentRepository.findByRegisterId(gpsData.getAgentRegisterId())
                .orElseGet(() -> {
                    Agent newAgent = new Agent();
                    newAgent.setRegisterId(gpsData.getAgentRegisterId());
                    newAgent.setName("Agente Externo (" + gpsData.getAgentRegisterId() + ")");
                    newAgent.setStatus("ATIVO");
                    return agentRepository.save(newAgent);
                });

        double distance = 0.0;

        if (agent.getLastLatitude() != null && agent.getLastLongitude() != null) {

            distance = calculateHaversineDistance(
                    agent.getLastLatitude(),
                    agent.getLastLongitude(),
                    gpsData.getLatitude(),
                    gpsData.getLongitude()
            );

            if (distance > 500.0) {
                System.out.println(" [GPS Impreciso] Distância absurda detectada (" + distance + " km). Ignorando ponto.");
                return;
            }
        }

        agent.setLastLatitude(gpsData.getLatitude());
        agent.setLastLongitude(gpsData.getLongitude());
        agent.setLastCheckIn(gpsData.getTimestamp());

        agentRepository.save(agent);

        RouteHistory history = new RouteHistory(
                agent.getRegisterId(),
                gpsData.getLatitude(),
                gpsData.getLongitude(),
                gpsData.getTimestamp(),
                distance
        );

        boolean alreadyExists =
        routeHistoryRepository
                .existsByAgentRegisterIdAndLatitudeAndLongitudeAndTimestamp(
                        agent.getRegisterId(),
                        gpsData.getLatitude(),
                        gpsData.getLongitude(),
                        gpsData.getTimestamp()
                );

if (!alreadyExists) {
    routeHistoryRepository.save(history);
}
    }

    private double calculateHaversineDistance(
            double lat1,
            double lon1,
            double lat2,
            double lon2
    ) {

        final int EARTH_RADIUS_KM = 6371;

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a =
                Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                        + Math.cos(Math.toRadians(lat1))
                        * Math.cos(Math.toRadians(lat2))
                        * Math.sin(lonDistance / 2)
                        * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_KM * c;
    }

    public java.util.List<Agent> findAll() {
        return agentRepository.findAll();
    }
}