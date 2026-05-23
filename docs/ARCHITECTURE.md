# Documentação Técnica — Sistema de Rastreamento de Equipes Externas

## 1. Visão Geral da Arquitetura

O sistema é composto por três camadas principais que se comunicam de forma desacoplada:

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Angular 19)                │
│         Signals · Material · Reactive Forms · Zod        │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP REST
┌─────────────────────▼───────────────────────────────────┐
│                   BACKEND (Spring Boot 3)                │
│        REST API · Schedulers · WebClient reativo         │
│                      │            │                      │
│                   MySQL        API GPS Externa           │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Decisões de Arquitetura

### 2.1 WebClient em vez de RestTemplate

O `WebClient` do Spring WebFlux permite chamadas HTTP não-bloqueantes. Com a API externa instável (erros 429 e 503 simulados), o operador `retryWhen` com `Retry.backoff` encadeia retentativas com intervalo exponencial sem bloquear threads do servidor — algo inviável com `RestTemplate` síncrono.

```java
.retryWhen(
    Retry.backoff(3, Duration.ofSeconds(2))
         .filter(ex -> status == 429 || status == 503)
)
```

### 2.2 Paginação reativa com Flux recursivo

A API externa retorna `hasMore: true` enquanto houver páginas adicionais. Implementamos `fetchAllPages()` usando `Flux.concatWith()` recursivo, percorrendo todas as páginas antes de registrar o `SyncLog`. Um limite de `MAX_PAGES = 20` protege contra loops infinitos.

```
Página 1 → hasMore=true → Página 2 → hasMore=true → Página 3 → hasMore=false → fim
```

### 2.3 Idempotência no processamento GPS

Antes de persistir cada ponto de rota, o sistema verifica a existência do registro pela combinação `agentRegisterId + latitude + longitude + timestamp`. Isso garante que reprocessar o mesmo `syncToken` não gere duplicatas no histórico.

### 2.4 SyncToken incremental

O `syncToken` retornado pela API é persistido na tabela `sync_logs` a cada ciclo bem-sucedido. Na próxima execução do Scheduler 1, o token mais recente é recuperado e enviado à API, que retorna apenas os registros novos desde aquele ponto.

### 2.5 Filtro de GPS impreciso (Haversine)

Pontos GPS com deslocamento superior a 500 km em relação ao último ponto registrado são descartados. O limiar foi definido com base no requisito do desafio de tratar "dados GPS imprecisos". O cálculo usa a fórmula de Haversine:

```
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlon/2)
c = 2 · atan2(√a, √(1−a))
d = R · c   (R = 6371 km)
```

### 2.6 Validação com Zod no frontend

O `AgentSchema` e o `CheckInSchema` definem as regras de validação de forma declarativa usando Zod. O método `safeParse()` é chamado no `onSubmit()` do `AgentFormComponent`, mapeando cada erro retornado ao campo correspondente do Reactive Form via `setErrors({ zodError: message })`. Isso exibe mensagens inline nos `mat-error` do Angular Material sem depender dos validators nativos do Angular.

### 2.7 Angular Signals com computed()

Os cards do painel usam `computed()` derivado do signal `agents` do `AgentService`. Qualquer alteração na lista (create, update, delete, sync automático) reflete automaticamente nos totais sem necessidade de eventos manuais ou subscriptions adicionais.

```typescript
totalAgents  = computed(() => this.agents().length)
activeAgents = computed(() => this.agents().filter(a => a.status === 'ATIVO').length)
```

---

## 3. Modelo de Dados

### agents
| Campo | Tipo | Descrição |
|---|---|---|
| id | BIGINT PK | Identificador interno |
| registerId | VARCHAR UNIQUE | ID único vindo da API externa |
| name | VARCHAR | Nome do agente |
| status | VARCHAR | ATIVO ou INATIVO |
| lastLatitude | DOUBLE | Última latitude registrada |
| lastLongitude | DOUBLE | Última longitude registrada |
| lastCheckIn | DATETIME | Timestamp do último registro |

### route_histories
| Campo | Tipo | Descrição |
|---|---|---|
| id | BIGINT PK | Identificador interno |
| agentRegisterId | VARCHAR | Referência ao agente |
| latitude | DOUBLE | Latitude do ponto |
| longitude | DOUBLE | Longitude do ponto |
| timestamp | DATETIME | Momento do registro |
| distanceTraveledKm | DOUBLE | Distância desde o ponto anterior (Haversine) |

### sync_logs
| Campo | Tipo | Descrição |
|---|---|---|
| id | BIGINT PK | Identificador interno |
| schedulerName | VARCHAR | Nome do scheduler executado |
| status | VARCHAR | SUCESSO, SUCESSO_PARCIAL ou ERRO |
| recordsSynced | INT | Quantidade de registros processados |
| syncTokenUsed | VARCHAR | Token utilizado no ciclo |
| executionTime | DATETIME | Momento da execução |
| errorMessage | TEXT | Mensagem de erro (quando aplicável) |

---

## 4. Schedulers

### Scheduler 1 — GPS_SYNC (30 segundos)
Recupera o último `syncToken` válido do banco, percorre todas as páginas da API externa via `fetchAllPages()` e processa cada registro GPS chamando `AgentService.processGpsLocation()`. Ao final, persiste um `SyncLog` com o total processado e o novo token.

### Scheduler 2 — RULES_VALIDATION (60 segundos)
Itera sobre todos os agentes cadastrados e valida se as coordenadas estão dentro dos limites geográficos válidos (lat: -90/90, lon: -180/180). Persiste um `SyncLog` com a contagem de agentes inválidos encontrados.

### Scheduler 3 — METRICS (5 minutos)
Agrega métricas operacionais básicas (total de agentes monitorados) e persiste no `SyncLog`. Serve como base para o painel de monitoramento.

### Scheduler 4 — DATABASE_MAINTENANCE (diariamente às 00:00)
Verifica o volume de logs acumulados. Se ultrapassar 1000 registros, remove os 100 mais antigos para manter o banco performático.

---

## 5. Tratamento de Erros da API Externa

| Cenário | Estratégia |
|---|---|
| HTTP 429 (rate limit) | Retry com backoff exponencial: 3 tentativas, intervalo inicial de 2s |
| HTTP 503 (instabilidade) | Mesmo retry do 429 |
| Resposta vazia / nula | `onErrorResume` retorna `Mono.empty()`, scheduler registra log sem falha crítica |
| GPS impreciso (> 500 km) | Ponto descartado silenciosamente, execução continua |
| Duplicata de ponto | Verificação prévia por chave composta, insert ignorado |
| Paginação infinita | Limite de MAX_PAGES = 20 páginas por ciclo |

---

## 6. Fluxo de Sincronização GPS

```
Scheduler 1 dispara (30s)
        │
        ▼
Recupera syncToken do banco
        │
        ▼
GET /v1/locations?token=<syncToken>
        │
   ┌────▼────┐
   │ hasMore │──── true ──→ GET próxima página (concatWith recursivo)
   └────┬────┘
        │ false
        ▼
Para cada GpsDataDto recebido:
  1. Valida campos obrigatórios
  2. Busca ou cria agente no banco
  3. Calcula distância Haversine
  4. Descarta se > 500 km (GPS impreciso)
  5. Verifica idempotência
  6. Persiste RouteHistory
  7. Atualiza posição do Agent
        │
        ▼
Persiste SyncLog (SUCESSO / SUCESSO_PARCIAL / ERRO)
```

---

## 7. Estrutura de Pastas

```
sistema-de-rastreamento-de-equipes/
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/java/com/example/backend/
│       ├── config/          # WebClientConfig
│       ├── controller/      # AgentController, SyncLogController
│       ├── dto/             # ApiResponseDto, GpsDataDto, CheckInRequest
│       ├── model/           # Agent, RouteHistory, SyncLog
│       ├── repository/      # AgentRepository, RouteHistoryRepository, SyncLogRepository
│       ├── scheduler/       # TrackingSchedulers (4 schedulers)
│       └── service/         # AgentService, GpsIntegrationService
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/app/
│       ├── components/
│       │   ├── agent-form/  # MatDialog com Reactive Forms + Zod
│       │   ├── agent-list/  # Listagem em tempo real
│       │   └── sync-logs/   # Painel de monitoramento
│       ├── schemas/         # agent.schema.ts (Zod)
│       └── services/        # agent.service.ts
├── docs/
│   └── ARCHITECTURE.md      # este arquivo
├── docker-compose.yml
└── README.md
```