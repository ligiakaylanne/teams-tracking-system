import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AgentService, Agent, RouteHistory } from '../../services/agent.service';
import { AgentFormComponent, AgentDialogData } from '../agent-form/agent-form.component';

@Component({
  selector: 'app-agent-list',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './agent-list.component.html'
})
export class AgentListComponent implements OnInit {
  private agentService = inject(AgentService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  public agents = this.agentService.agents;
  public selectedAgentName = signal<string | null>(null);
  public routeHistory = signal<RouteHistory[]>([]);

  ngOnInit(): void {
    this.fetchData();
    setInterval(() => this.fetchData(), 10000);
  }

  private fetchData(): void {
    this.agentService.loadAgents().subscribe();
  }

  public openCreateDialog(): void {
    const ref = this.dialog.open<AgentFormComponent, AgentDialogData>(AgentFormComponent, {
      data: { mode: 'create' },
      disableClose: true,
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.agentService.createAgent(result.payload).subscribe({
        next: () => this.snackBar.open('Agente criado com sucesso!', 'OK', { duration: 3000 }),
        error: () => this.snackBar.open('Erro ao criar agente.', 'OK', { duration: 3000 }),
      });
    });
  }

  public openEditDialog(agent: Agent): void {
    const ref = this.dialog.open<AgentFormComponent, AgentDialogData>(AgentFormComponent, {
      data: { mode: 'edit', agent },
      disableClose: true,
    });

    ref.afterClosed().subscribe(result => {
      if (!result || !agent.id) return;
      this.agentService.updateAgent(agent.id, result.payload).subscribe({
        next: () => this.snackBar.open('Agente atualizado!', 'OK', { duration: 3000 }),
        error: () => this.snackBar.open('Erro ao atualizar agente.', 'OK', { duration: 3000 }),
      });
    });
  }

  public openCheckInDialog(agent: Agent): void {
    const ref = this.dialog.open<AgentFormComponent, AgentDialogData>(AgentFormComponent, {
      data: { mode: 'checkin', agent },
      disableClose: true,
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.agentService.manualCheckIn(agent.registerId, result.payload).subscribe({
        next: () => this.snackBar.open('Check-in registrado!', 'OK', { duration: 3000 }),
        error: () => this.snackBar.open('Erro ao registrar check-in.', 'OK', { duration: 3000 }),
      });
    });
  }

  public deleteAgent(agent: Agent): void {
    if (!agent.id) return;
    if (!confirm(`Remover agente "${agent.name}"?`)) return;

    this.agentService.deleteAgent(agent.id).subscribe({
      next: () => this.snackBar.open('Agente removido.', 'OK', { duration: 3000 }),
      error: () => this.snackBar.open('Erro ao remover agente.', 'OK', { duration: 3000 }),
    });
  }

  public openRouteModal(registerId: string, agentName: string): void {
    this.selectedAgentName.set(agentName);
    this.agentService.getAgentRoute(registerId).subscribe({
      next: (data) => this.routeHistory.set(data),
      error: () => this.routeHistory.set([])
    });
  }

  public closeRouteModal(): void {
    this.selectedAgentName.set(null);
    this.routeHistory.set([]);
  }
}
