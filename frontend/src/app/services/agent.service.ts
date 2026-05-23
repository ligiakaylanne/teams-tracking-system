import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AgentFormData, CheckInFormData } from '../schemas/agent.schema';

export interface Agent {
  id?: number;
  registerId: string;
  name: string;
  status: string;
  lastLatitude?: number;
  lastLongitude?: number;
  lastCheckIn?: string;
}

export interface RouteHistory {
  id: number;
  registerId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  distanceTraveledKm: number;
}

export interface SyncLog {
  id: number;
  executionTime: string;
  schedulerName: string;
  status: string;
  recordsSynced: number;
  syncTokenUsed?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api';
  public agents = signal<Agent[]>([]);

  public loadAgents(): Observable<Agent[]> {
    return this.http.get<Agent[]>(`${this.apiUrl}/agents`).pipe(
      tap((data) => this.agents.set(data))
    );
  }

  public createAgent(data: AgentFormData): Observable<Agent> {
    return this.http.post<Agent>(`${this.apiUrl}/agents`, data).pipe(
      tap(() => this.loadAgents().subscribe())
    );
  }

  public updateAgent(id: number, data: AgentFormData): Observable<Agent> {
    return this.http.put<Agent>(`${this.apiUrl}/agents/${id}`, data).pipe(
      tap(() => this.loadAgents().subscribe())
    );
  }

  public deleteAgent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/agents/${id}`).pipe(
      tap(() => this.agents.update(list => list.filter(a => a.id !== id)))
    );
  }

  public manualCheckIn(registerId: string, payload: CheckInFormData): Observable<RouteHistory> {
    return this.http.post<RouteHistory>(
      `${this.apiUrl}/agents/${registerId}/check-in`,
      payload
    );
  }

  public getAgentRoute(registerId: string): Observable<RouteHistory[]> {
    return this.http.get<RouteHistory[]>(`${this.apiUrl}/agents/${registerId}/route`);
  }

  public getSyncLogs(): Observable<SyncLog[]> {
    return this.http.get<SyncLog[]>(`${this.apiUrl}/sync-logs`);
  }
}
