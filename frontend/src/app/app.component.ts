import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AgentService } from './services/agent.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="bg-gray-900 min-h-screen text-white">

      <!-- Navbar -->
      <nav class="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <span class="text-lg font-bold text-emerald-400"> Rastreamento de Equipes</span>
          <div class="flex gap-2">
            <a routerLink="/" routerLinkActive="!bg-emerald-600"
               [routerLinkActiveOptions]="{exact: true}"
               class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 transition-colors">
               Painel
            </a>
            <a routerLink="/mapa" routerLinkActive="!bg-emerald-600"
               class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 transition-colors">
               Mapa
            </a>
          </div>
        </div>
      </nav>

      <!-- Router outlet for /mapa -->
      <router-outlet></router-outlet>

    </div>
  `
})
export class AppComponent implements OnInit {
  private agentService = inject(AgentService);

  public totalAgents   = computed(() => this.agentService.agents().length);
  public activeAgents  = computed(() => this.agentService.agents().filter(a => a.status === 'ATIVO').length);
  public inactiveAgents = computed(() => this.agentService.agents().filter(a => a.status === 'INATIVO').length);
  public lastUpdate    = signal<string>('--:--:--');

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
