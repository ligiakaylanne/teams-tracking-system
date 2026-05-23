import { Component, OnInit, OnDestroy, inject, signal, computed, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { AgentService, Agent, RouteHistory } from '../../services/agent.service';

const GEOFENCE_RADIUS_M = 500;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gray-900 min-h-screen text-white">

      <div class="max-w-7xl mx-auto px-6 pt-8 pb-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-3xl font-bold text-emerald-400">Mapa de Operações</h1>
            <p class="text-gray-400 text-sm mt-1">Posições em tempo real — atualiza a cada 15 segundos</p>
          </div>
          <div class="flex items-center gap-6 text-sm">
            <span class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Ativo ({{ activeCount() }})
            </span>
            <span class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span> Inativo ({{ inactiveCount() }})
            </span>
            <!-- Toggle geofencing -->
            <button
              (click)="toggleGeofencing()"
              [class]="geofencingEnabled()
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              🔵 Geofencing {{ geofencingEnabled() ? 'ON' : 'OFF' }}
            </button>
          </div>
        </div>

        <!-- Agent selector -->
        <div class="flex gap-2 flex-wrap mb-4">
          <button
            (click)="clearRoute()"
            [class]="selectedAgentId() === null ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            Todos
          </button>
          @for (agent of agents(); track agent.id) {
            <button
              (click)="showRoute(agent)"
              [class]="selectedAgentId() === agent.registerId ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {{ agent.name }}
            </button>
          }
        </div>
      </div>

      <!-- Map -->
      <div class="mx-6 rounded-2xl border border-gray-700 shadow-2xl" style="height: 560px;">
        <div id="leaflet-map" style="height: 100%; width: 100%; border-radius: 16px;"></div>
      </div>

      <!-- Legenda geofencing -->
      @if (geofencingEnabled()) {
        <div class="max-w-7xl mx-auto px-6 mt-3">
          <div class="bg-gray-800 border border-indigo-800 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-gray-300">
            <span class="text-indigo-400 text-base">🔵</span>
            <span>Cada círculo representa uma <strong class="text-white">zona de operação de {{ GEOFENCE_RADIUS_M }}m</strong> ao redor da última posição do agente.</span>
            <span class="ml-auto text-xs text-gray-500">Agentes fora da zona ficam com borda vermelha.</span>
          </div>
        </div>
      }

      <!-- Route info -->
      @if (routePoints().length > 0) {
        <div class="max-w-7xl mx-auto px-6 mt-3 pb-8">
          <div class="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
            <div class="text-sm text-gray-300">
              <span class="text-white font-semibold">{{ selectedAgentName() }}</span>
              — {{ routePoints().length }} pontos de rota registrados hoje
            </div>
            <button (click)="clearRoute()" class="text-gray-400 hover:text-white text-sm transition-colors">
              ✕ Limpar rota
            </button>
          </div>
        </div>
      }

    </div>
  `,
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  private agentService = inject(AgentService);

  public agents = this.agentService.agents;
  public selectedAgentId = signal<string | null>(null);
  public selectedAgentName = signal<string>('');
  public routePoints = signal<RouteHistory[]>([]);
  public geofencingEnabled = signal<boolean>(true);

  public activeCount = computed(() => this.agents().filter(a => a.status === 'ATIVO').length);
  public inactiveCount = computed(() => this.agents().filter(a => a.status === 'INATIVO').length);

  public readonly GEOFENCE_RADIUS_M = GEOFENCE_RADIUS_M;

  private map!: L.Map;
  private markers = new Map<string, L.Marker>();
  private geofenceCircles = new Map<string, L.Circle>();
  private routeLayer: L.LayerGroup | null = null;
  private refreshInterval: any = null;

  ngOnInit(): void {
    this.agentService.loadAgents().subscribe();
    this.refreshInterval = setInterval(() => {
      this.agentService.loadAgents().subscribe(() => this.refreshMarkers());
    }, 15000);
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.agentService.loadAgents().subscribe(() => this.renderMarkers());
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    const iconDefault = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    L.Marker.prototype.options.icon = iconDefault;

    this.map = L.map('leaflet-map', { zoomControl: true }).setView([-15.7801, -47.9292], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    setTimeout(() => this.map.invalidateSize(), 300);
  }

  private renderMarkers(): void {
    this.agents().forEach(agent => {
      if (!agent.lastLatitude || !agent.lastLongitude) return;
      this.addOrUpdateMarker(agent);
      this.addOrUpdateGeofence(agent);
    });

    const valid = this.agents().filter(a => a.lastLatitude && a.lastLongitude);
    if (valid.length > 0) {
      const bounds = valid.map(a => [a.lastLatitude!, a.lastLongitude!] as [number, number]);
      this.map.fitBounds(bounds, { padding: [60, 60] });
    }
  }

  private refreshMarkers(): void {
    if (!this.map) return;
    this.agents().forEach(agent => {
      if (!agent.lastLatitude || !agent.lastLongitude) return;
      this.addOrUpdateMarker(agent);
      this.addOrUpdateGeofence(agent);
    });
  }

  private addOrUpdateGeofence(agent: Agent): void {
    const isAtivo = agent.status === 'ATIVO';
    const color = isAtivo ? '#6366f1' : '#f59e0b';

    const circleOptions: L.CircleOptions = {
      radius: GEOFENCE_RADIUS_M,
      color: color,
      fillColor: color,
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '6, 4',
    };

    if (this.geofenceCircles.has(agent.registerId)) {
      const circle = this.geofenceCircles.get(agent.registerId)!;
      circle.setLatLng([agent.lastLatitude!, agent.lastLongitude!]);
      circle.setStyle(circleOptions);
      if (this.geofencingEnabled()) {
        circle.addTo(this.map);
      } else {
        circle.remove();
      }
    } else {
      const circle = L.circle([agent.lastLatitude!, agent.lastLongitude!], circleOptions)
        .bindTooltip(`Zona: ${agent.name} (${GEOFENCE_RADIUS_M}m)`, { permanent: false });

      if (this.geofencingEnabled()) {
        circle.addTo(this.map);
      }
      this.geofenceCircles.set(agent.registerId, circle);
    }
  }

  public toggleGeofencing(): void {
    const next = !this.geofencingEnabled();
    this.geofencingEnabled.set(next);

    this.geofenceCircles.forEach(circle => {
      if (next) {
        circle.addTo(this.map);
      } else {
        circle.remove();
      }
    });
  }

  private addOrUpdateMarker(agent: Agent): void {
    const isAtivo = agent.status === 'ATIVO';
    const color = isAtivo ? '#10b981' : '#f59e0b';

    const icon = L.divIcon({
      className: '',
      html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);position:relative;">
               <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${color};"></div>
             </div>`,
      iconSize: [16, 22],
      iconAnchor: [8, 22],
      popupAnchor: [0, -24],
    });

    const popup = `
      <div style="font-family:sans-serif;min-width:160px;">
        <strong style="font-size:14px;">${agent.name}</strong><br>
        <span style="display:inline-block;margin:4px 0;background:${isAtivo ? '#d1fae5' : '#fef3c7'};color:${isAtivo ? '#065f46' : '#92400e'};padding:1px 8px;border-radius:999px;font-size:11px;">${agent.status}</span><br>
        <span style="font-size:11px;color:#555;">
          Reg: ${agent.registerId}<br>
          Lat: ${agent.lastLatitude?.toFixed(6)}<br>
          Lng: ${agent.lastLongitude?.toFixed(6)}<br>
          ${agent.lastCheckIn ? 'Check-in: ' + new Date(agent.lastCheckIn).toLocaleString('pt-BR') : ''}
        </span>
      </div>`;

    if (this.markers.has(agent.registerId)) {
      const marker = this.markers.get(agent.registerId)!;
      marker.setLatLng([agent.lastLatitude!, agent.lastLongitude!]);
      marker.setIcon(icon);
      marker.getPopup()?.setContent(popup);
    } else {
      const marker = L.marker([agent.lastLatitude!, agent.lastLongitude!], { icon })
        .bindPopup(popup)
        .addTo(this.map);
      marker.on('click', () => this.showRoute(agent));
      this.markers.set(agent.registerId, marker);
    }
  }

  public showRoute(agent: Agent): void {
    this.selectedAgentId.set(agent.registerId);
    this.selectedAgentName.set(agent.name);

    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }

    this.agentService.getAgentRoute(agent.registerId).subscribe(points => {
      this.routePoints.set(points);
      if (points.length === 0) return;

      const latlngs = points.map(p => [p.latitude, p.longitude] as [number, number]);
      this.routeLayer = L.layerGroup().addTo(this.map);

      L.polyline(latlngs, { color: '#6366f1', weight: 3, opacity: 0.8, dashArray: '6, 6' })
        .addTo(this.routeLayer);

      L.circleMarker(latlngs[0], { radius: 7, color: '#6366f1', fillColor: '#fff', fillOpacity: 1, weight: 2 })
        .bindTooltip('Início').addTo(this.routeLayer);

      L.circleMarker(latlngs[latlngs.length - 1], { radius: 7, color: '#6366f1', fillColor: '#6366f1', fillOpacity: 1, weight: 2 })
        .bindTooltip('Último ponto').addTo(this.routeLayer);

      this.map.fitBounds(latlngs, { padding: [50, 50] });
    });
  }

  public clearRoute(): void {
    this.selectedAgentId.set(null);
    this.selectedAgentName.set('');
    this.routePoints.set([]);
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }
  }
}
