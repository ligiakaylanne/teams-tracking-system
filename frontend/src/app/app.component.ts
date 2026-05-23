import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentListComponent } from './components/agent-list/agent-list.component';
import { SyncLogsComponent } from './components/sync-logs/sync-logs.component';
import { AgentService } from './services/agent.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AgentListComponent, SyncLogsComponent],
  template: `
    <div class="bg-gray-900 min-h-screen text-white">

      <div class="max-w-7xl mx-auto px-6 pt-8">

        <h1 class="text-4xl font-bold mb-8">Painel Operacional</h1>

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
            <h2 class="text-gray-400 text-sm mb-2">Última Atualização</h2>
            <p class="text-lg font-bold text-purple-400">{{ lastUpdate() }}</p>
          </div>

        </div>

      </div>

      <app-agent-list></app-agent-list>

      <div class="max-w-7xl mx-auto px-6 pb-12">
        <app-sync-logs></app-sync-logs>
      </div>

    </div>
  `
})
export class AppComponent implements OnInit {
  private agentService = inject(AgentService);

  public totalAgents = computed(() => this.agentService.agents().length);
  public activeAgents = computed(() => this.agentService.agents().filter(a => a.status === 'ATIVO').length);
  public inactiveAgents = computed(() => this.agentService.agents().filter(a => a.status === 'INATIVO').length);
  public lastUpdate = signal<string>('--:--:--');

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
