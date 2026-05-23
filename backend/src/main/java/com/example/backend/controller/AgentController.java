package com.example.backend.controller;

import com.example.backend.dto.CheckInRequest;
import com.example.backend.model.Agent;
import com.example.backend.model.RouteHistory;
import com.example.backend.repository.AgentRepository;
import com.example.backend.repository.RouteHistoryRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/agents")
@CrossOrigin(origins = "http://localhost:4200")
public class AgentController {

    private final AgentRepository agentRepository;
    private final RouteHistoryRepository routeHistoryRepository;

    public AgentController(
            AgentRepository agentRepository,
            RouteHistoryRepository routeHistoryRepository
    ) {
        this.agentRepository = agentRepository;
        this.routeHistoryRepository = routeHistoryRepository;
    }

    @GetMapping
    public List<Agent> getAllAgents() {
        return agentRepository.findAll();
    }

    @GetMapping("/{registerId}/route")
    public List<RouteHistory> getAgentRoute(
            @PathVariable String registerId
    ) {
        return routeHistoryRepository
                .findByAgentRegisterIdOrderByTimestampDesc(registerId);
    }

    @PostMapping
    public Agent createAgent(@RequestBody Agent agent) {
        return agentRepository.save(agent);
    }

    @PutMapping("/{id}")
    public Agent updateAgent(
            @PathVariable Long id,
            @RequestBody Agent agent
    ) {

        return agentRepository.findById(id)
                .map(existingAgent -> {

                    existingAgent.setName(agent.getName());
                    existingAgent.setStatus(agent.getStatus());

                    return agentRepository.save(existingAgent);

                }).orElseThrow(() ->
                        new RuntimeException(
                                "Agente não encontrado com ID: " + id
                        )
                );
    }

    @DeleteMapping("/{id}")
    public void deleteAgent(@PathVariable Long id) {
        agentRepository.deleteById(id);
    }

    @PostMapping("/{registerId}/check-in")
    public RouteHistory manualCheckIn(
            @PathVariable String registerId,
            @RequestBody CheckInRequest request
    ) {

        Agent agent = agentRepository.findByRegisterId(registerId)
                .orElseThrow(() ->
                        new RuntimeException("Agente não encontrado")
                );

        RouteHistory history = new RouteHistory(
                registerId,
                request.latitude(),
                request.longitude(),
                LocalDateTime.now(),
                0.0
        );

        return routeHistoryRepository.save(history);
    }
}