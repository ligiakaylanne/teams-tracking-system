package com.example.backend.scheduler;

import com.example.backend.model.SyncLog;
import com.example.backend.repository.SyncLogRepository;
import com.example.backend.service.AgentService;
import com.example.backend.service.GpsIntegrationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class TrackingSchedulers {

    private final GpsIntegrationService gpsService;
    private final SyncLogRepository syncLogRepository;
    private final AgentService agentService;

    public TrackingSchedulers(GpsIntegrationService gpsService, SyncLogRepository syncLogRepository,
            AgentService agentService) {
        this.gpsService = gpsService;
        this.syncLogRepository = syncLogRepository;
        this.agentService = agentService;
    }

    @Scheduled(initialDelay = 0, fixedRate = 30000)
    public void runGpsSync() {
        System.out.println("[Scheduler 1] Iniciando sincronização incremental com paginação...");

        String currentToken = syncLogRepository.findLastValidSyncToken().orElse("initial_token");

        AtomicInteger totalProcessed = new AtomicInteger(0);
        AtomicInteger totalErrors = new AtomicInteger(0);
        AtomicReference<String> lastToken = new AtomicReference<>(currentToken);

        gpsService.fetchAllPages(currentToken)
                .doOnNext(dto -> {
                    try {
                        agentService.processGpsLocation(dto);
                        totalProcessed.incrementAndGet();
                        // atualiza o token a cada registro recebido
                        if (dto != null) {
                            lastToken.set(currentToken);
                        }
                    } catch (Exception e) {
                        totalErrors.incrementAndGet();
                        System.err.println("[Scheduler 1] Erro ao processar agente "
                                + dto.getAgentRegisterId() + ": " + e.getMessage());
                    }
                })
                .doOnComplete(() -> {
                    System.out.println("[Scheduler 1] Sincronização concluída. Total processado: "
                            + totalProcessed.get() + " | Erros: " + totalErrors.get());
                    syncLogRepository.save(new SyncLog(
                            "GPS_SYNC",
                            totalErrors.get() == 0 ? "SUCESSO" : "SUCESSO_PARCIAL",
                            totalProcessed.get(),
                            lastToken.get(),
                            totalErrors.get() > 0 ? totalErrors.get() + " erros ao processar registros" : null
                    ));
                })
                .doOnError(error -> {
                    System.err.println("[Scheduler 1] Falha crítica: " + error.getMessage());
                    syncLogRepository.save(new SyncLog(
                            "GPS_SYNC", "ERRO", 0, currentToken, error.getMessage()
                    ));
                })
                .subscribe();
    }

    @Scheduled(fixedRate = 60000)
    public void runBusinessRulesValidation() {
        System.out.println("[Scheduler 2] Validando regras de negócio...");

        int invalidAgents = 0;

        for (var agent : agentService.findAll()) {
            boolean invalid = false;

            if (agent.getLastLatitude() == null || agent.getLastLongitude() == null) {
                invalid = true;
            } else if (agent.getLastLatitude() < -90 || agent.getLastLatitude() > 90) {
                invalid = true;
            } else if (agent.getLastLongitude() < -180 || agent.getLastLongitude() > 180) {
                invalid = true;
            }

            if (invalid) {
                invalidAgents++;
                System.out.println("[Scheduler 2] Agente inválido: " + agent.getRegisterId());
            }
        }

        syncLogRepository.save(new SyncLog("RULES_VALIDATION", "SUCESSO", invalidAgents, null, null));
        System.out.println("[Scheduler 2] Validação concluída. Inválidos: " + invalidAgents);
    }

    @Scheduled(fixedRate = 300000)
    public void runMetricsAggregation() {
        System.out.println("[Scheduler 3] Gerando métricas operacionais...");

        int totalAgents = agentService.findAll().size();

        syncLogRepository.save(new SyncLog("METRICS", "SUCESSO", totalAgents, null, null));
        System.out.println("[Scheduler 3] Total de agentes monitorados: " + totalAgents);
    }

    @Scheduled(cron = "0 0 0 * * ?")
    public void runDatabaseMaintenance() {
        System.out.println("[Scheduler 4] Executando manutenção do banco...");

        int totalLogs = (int) syncLogRepository.count();

        if (totalLogs > 1000) {
            var logs = syncLogRepository.findAll();
            syncLogRepository.deleteAll(logs.subList(0, 100));
            System.out.println("[Scheduler 4] 100 logs antigos removidos.");
        }

        syncLogRepository.save(new SyncLog("DATABASE_MAINTENANCE", "SUCESSO", totalLogs, null, null));
        System.out.println("[Scheduler 4] Manutenção concluída.");
    }
}