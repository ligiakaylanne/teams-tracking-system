# 🗺️ Sistema de Rastreamento de Equipes Externas

Sistema fullstack para monitoramento operacional de agentes de campo em tempo real, com rastreamento GPS, sincronização automática via API externa, mapa interativo com geofencing e painel de monitoramento.

---

## Arquitetura

```
sistema-de-rastreamento-de-equipes/
├── backend/                  # Spring Boot 3 + Java 17
├── frontend/                 # Angular 19
├── docker-compose.yml        # Orquestração completa
├── docs/                     # Documentação adicional
└── README.md
```

**Fluxo geral:**

```
API GPS Externa
      │
      ▼
 Spring Boot (Schedulers + Circuit Breaker)
      │  WebClient reativo + retry + paginação
      ▼
   MySQL DB ──── Spring Data JPA
      │
      ▼
 REST API (/api/agents, /api/sync-logs)
      │
      ▼
 Angular 19 (Signals + Material + Zod + Leaflet)
```

---

##  Como executar

### Com Docker (recomendado)

Pré-requisitos: Docker e Docker Compose instalados.

```bash
git clone <url-do-repositorio>
cd teams-tracking-system

docker-compose up --build
```

Serviços disponíveis após subir:

| Serviço   | URL                                   |
|-----------|---------------------------------------|
| Frontend  | http://localhost:4200                 |
| Backend   | http://localhost:8080                 |
| Swagger   | http://localhost:8080/swagger-ui.html |
| Actuator  | http://localhost:8080/actuator/health |
| MySQL     | localhost:3307                        |

### Sem Docker (desenvolvimento local)

**Backend:**
```bash
cd backend
./mvnw spring-boot:run
```
> Requer MySQL rodando na porta 3307. Ajuste `application.properties` se necessário.

**Frontend:**
```bash
cd frontend
npm install
npm start
```
> Disponível em http://localhost:4200

---

##  Funcionalidades

### Gestão de Agentes
- CRUD completo via interface (criar, editar, remover agentes)
- Formulário com validação em tempo real usando **Zod + Reactive Forms**
- Listagem com atualização automática a cada 10 segundos
- Indicador de status (ATIVO / INATIVO)

### Rastreamento GPS
- Sincronização automática com API externa a cada 30 segundos
- Paginação completa — percorre todas as páginas via `hasMore` + `nextSyncToken`
- Histórico completo de rota por agente com distância percorrida
- Check-in manual de posição com validação de coordenadas

### Regras de Negócio
- **Haversine** — cálculo de distância entre coordenadas geográficas
- **Filtro de GPS impreciso** — pontos com deslocamento > 500 km são descartados
- **Validação de coordenadas** — latitude entre -90/90, longitude entre -180/180
- **Idempotência** — duplicatas identificadas por `agentId + lat + lng + timestamp` não são persistidas

### Mapa Interativo (Leaflet)
- Pins coloridos por status: verde (ATIVO) e amarelo (INATIVO)
- Visualização da rota do agente ao clicar no pin ou no botão
- Linha tracejada com marcadores de início e fim de rota
- Atualização automática das posições a cada 15 segundos
- **Geofencing visual** — círculos de 500m por agente com toggle ON/OFF

### Painel de Monitoramento
- Cards com dados reais: total de agentes, ativos, inativos e horário da última atualização
- Tabela de logs dos schedulers com status, token utilizado e registros sincronizados
- Navegação entre Painel e Mapa via navbar

---

##  Schedulers

| # | Nome | Intervalo | Responsabilidade |
|---|------|-----------|-----------------|
| 1 | `GPS_SYNC` | 30 segundos | Sincronização incremental com a API externa, percorrendo todas as páginas |
| 2 | `RULES_VALIDATION` | 60 segundos | Valida coordenadas de todos os agentes e registra inconsistências |
| 3 | `METRICS` | 5 minutos | Agrega métricas operacionais do sistema |
| 4 | `DATABASE_MAINTENANCE` | Diariamente (00:00) | Limpeza de logs antigos quando total > 1000 registros |

---

##  Integração com API Externa

**Base URL:** `https://desafio-media.onrender.com`

### Comportamentos tratados

| Comportamento | Tratamento implementado |
|---|---|
| Rate limit `429` | Retry com exponential backoff (3x, intervalo de 2s) |
| Instabilidade `503` | Mesmo retry do 429 |
| Paginação obrigatória | Loop reativo com `Flux` percorrendo até 20 páginas |
| GPS impreciso | Filtro Haversine descarta pontos > 500 km do último ponto |
| Sincronização incremental | `syncToken` persistido no banco e reutilizado a cada ciclo |
| Falhas consecutivas | Circuit Breaker abre após 50% de falhas em 10 chamadas |

---

##  Circuit Breaker — Resilience4j

O serviço de integração GPS é protegido por um Circuit Breaker com três estados:

```
CLOSED (normal) ──► falhas > 50% em 10 calls ──► OPEN (bloqueado por 30s)
                                                        │
                                                        ▼
                                                  HALF-OPEN (testa 3 calls)
                                                        │
                                          sucesso ◄─────┴────► falha → OPEN
```

- **CLOSED** — chamadas fluem normalmente
- **OPEN** — fallback ativado, retorna `Mono.empty()` sem propagar erro ao scheduler
- **HALF-OPEN** — testa 3 chamadas antes de decidir reabrir ou fechar o circuito

Estado em tempo real disponível em:
```
http://localhost:8080/actuator/health
```

---

##  Decisões Técnicas

### Backend

**WebClient em vez de RestTemplate**
O `WebClient` do Spring WebFlux permite chamadas não-bloqueantes. Com a API externa instável (429/503), o `retryWhen` com `Retry.backoff` encadeia retentativas sem bloquear threads — o que seria inviável com `RestTemplate`.

**Paginação com Flux recursivo**
A API retorna `hasMore: true` enquanto houver mais páginas. Implementamos `fetchAllPages()` que encadeia chamadas reativas via `Flux.concatWith()`, garantindo que todos os registros do ciclo sejam processados antes de registrar o SyncLog. Um limite de `MAX_PAGES = 20` protege contra loops infinitos.

**Circuit Breaker com Resilience4j**
A anotação `@CircuitBreaker(name = "gpsApi", fallbackMethod = "fetchPageFallback")` protege o método `fetchPage()`. Quando o circuito está aberto, o fallback retorna `Mono.empty()` silenciosamente, evitando que falhas da API externa travem os schedulers.

**Idempotência no RouteHistory**
Antes de persistir cada ponto GPS, verificamos a existência do registro por `agentRegisterId + latitude + longitude + timestamp`. Isso evita duplicatas em caso de reprocessamento do mesmo `syncToken`.

**`application.properties` com variáveis de ambiente**
Todas as configurações sensíveis usam o padrão `${VAR:valor_padrao}`, permitindo sobrescrever via environment no Docker sem alterar o arquivo para rodar localmente.

### Frontend

**Angular Signals + `computed()`**
Os cards do painel usam `computed()` derivado do signal `agents` do `AgentService`. Qualquer atualização na lista de agentes reflete automaticamente nos totais — sem necessidade de eventos manuais.

**Zod como camada de validação**
O `AgentSchema` e o `CheckInSchema` definem as regras de validação (tipos, ranges, regex) de forma declarativa. O método `safeParse()` é chamado no `onSubmit()` do dialog — os erros são mapeados campo a campo para os controles do `ReactiveForm`, exibindo mensagens inline no Material `mat-error`.

**MatDialog para CRUD**
Unifica criar, editar e check-in em um único componente `AgentFormComponent`, passando o `mode` via `MAT_DIALOG_DATA`. Evita triplicar lógica e mantém o código coeso.

**Leaflet com geofencing visual**
O mapa usa `import * as L from 'leaflet'` (via npm) e inicializa no `ngAfterViewInit` para garantir que o DOM existe. Cada agente tem um `L.circle` de 500m representando sua zona de operação, com toggle ON/OFF via signal. A rota é desenhada com `L.polyline` + marcadores de início e fim ao clicar no agente.

---

##  Modelo de dados

```
agents
├── id (PK)
├── registerId (unique)
├── name
├── status (ATIVO | INATIVO)
├── lastLatitude
├── lastLongitude
└── lastCheckIn

route_histories
├── id (PK)
├── agentRegisterId (FK → agents.registerId)
├── latitude
├── longitude
├── timestamp
└── distanceTraveledKm

sync_logs
├── id (PK)
├── schedulerName
├── status (SUCESSO | SUCESSO_PARCIAL | ERRO)
├── recordsSynced
├── syncTokenUsed
├── executionTime
└── errorMessage
```

---

##  Tecnologias

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| Java | 17 | Linguagem |
| Spring Boot | 3.x | Framework principal |
| Spring Data JPA | — | Persistência |
| Spring WebFlux / WebClient | — | Integração reativa com API externa |
| Spring Scheduler | — | Agendamento dos 4 schedulers |
| Resilience4j | 2.2.0 | Circuit Breaker na integração GPS |
| MySQL | 8.0 | Banco de dados |
| Lombok | — | Redução de boilerplate |
| Springdoc OpenAPI | 2.6.0 | Swagger UI |
| Spring Actuator | — | Healthcheck para Docker e métricas |

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| Angular | 19 | Framework principal |
| Angular Signals | — | Estado reativo e computed values |
| Angular Material | 19 | Componentes UI (Dialog, Form Fields, Snackbar) |
| Reactive Forms | — | Formulários |
| Zod | 4.x | Validação de schemas |
| RxJS | 7.x | Operadores reativos |
| Leaflet | 1.9.4 | Mapa interativo com geofencing |
| Tailwind CSS | 4.x | Estilização |
| Nginx | 1.25 | Servidor web (produção via Docker) |

---

##  API Reference

A documentação interativa completa está disponível via Swagger em:
```
http://localhost:8080/swagger-ui.html
```

Endpoints principais:

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/agents` | Lista todos os agentes |
| `POST` | `/api/agents` | Cria novo agente |
| `PUT` | `/api/agents/{id}` | Atualiza agente |
| `DELETE` | `/api/agents/{id}` | Remove agente |
| `GET` | `/api/agents/{registerId}/route` | Histórico de rota do agente |
| `POST` | `/api/agents/{registerId}/check-in` | Registra check-in manual |
| `GET` | `/api/sync-logs` | Lista logs de sincronização |
| `GET` | `/actuator/health` | Status do sistema e circuit breaker |

---

##  Diferenciais implementados

| Diferencial | Status |
|---|---|
| Dockerização completa | ✅ MySQL + Backend + Frontend + Nginx |
| Swagger / OpenAPI | ✅ Disponível em /swagger-ui.html |
| Mapa interativo com Leaflet | ✅ Pins coloridos, rotas e geofencing |
| Geofencing visual | ✅ Círculos de 500m com toggle ON/OFF |
| Circuit Breaker com Resilience4j | ✅ Proteção na integração GPS |