import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentListComponent } from '../agent-list/agent-list.component';
import { SyncLogsComponent } from '../sync-logs/sync-logs.component';
import { AgentService } from '../../services/agent.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AgentListComponent, SyncLogsComponent],
  template: `
    <div class="max-w-7xl mx-auto px-6 pt-8">
      <div class="mb-8">
        <h1 class="text-4xl font-bold">Painel Operacional</h1>
        <p class="text-gray-400 text-sm mt-1">Última atualização: {{ lastUpdate() }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div class="bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 class="text-gray-400 text-sm mb-2">Agentes Monitorados</h2>
          <p class="text-3xl font-bold text-green-400">{{ totalAgents() }}</p>
        </div>
        <div class="bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 class="text-gray-400 text-sm mb-2">Agentes Ativos</h2>
          <p class="text-3xl font-bold text-blue-400">{{ activeAgents() }}</p>
        </div>
        <div class="bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 class="text-gray-400 text-sm mb-2">Agentes Inativos</h2>
          <p class="text-3xl font-bold text-yellow-400">{{ inactiveAgents() }}</p>
        </div>
        <div class="bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 class="text-gray-400 text-sm mb-2">Schedulers</h2>
          <p class="text-3xl font-bold text-purple-400">4 / 4</p>
        </div>
      </div>
    </div>

    <app-agent-list></app-agent-list>

    <div class="max-w-7xl mx-auto px-6 pb-12">
      <app-sync-logs></app-sync-logs>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private agentService = inject(AgentService);

  public totalAgents    = computed(() => this.agentService.agents().length);
  public activeAgents   = computed(() => this.agentService.agents().filter(a => a.status === 'ATIVO').length);
  public inactiveAgents = computed(() => this.agentService.agents().filter(a => a.status === 'INATIVO').length);
  public lastUpdate     = signal<string>('--:--:--');

  ngOnInit(): void {
    this.load();
    setInterval(() => this.load(), 10000);
  }

  private load(): void {
    this.agentService.loadAgents().subscribe(() => {
      this.lastUpdate.set(new Date().toLocaleTimeString('pt-BR'));
    });
  }
}
