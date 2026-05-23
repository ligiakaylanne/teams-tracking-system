import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService, SyncLog } from '../../services/agent.service';

@Component({
  selector: 'app-sync-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-logs.component.html'
})
export class SyncLogsComponent implements OnInit {
  private agentService = inject(AgentService);
  public logs = signal<SyncLog[]>([]);

  ngOnInit(): void {
    this.loadLogs();
    setInterval(() => this.loadLogs(), 15000);
  }

  private loadLogs(): void {
    this.agentService.getSyncLogs().subscribe({
      next: (data) => this.logs.set(data),
      error: () => this.logs.set([])
    });
  }
}
