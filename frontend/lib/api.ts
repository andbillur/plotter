import { API_BASE_URL } from './constants';
import type { User, Bobin, PaginatedResponse } from './types';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
    }
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      }
      throw new Error((data as { error?: string }).error || `HTTP ${response.status}`);
    }
    return data as T;
  }

  // Auth
  async login(username: string, password: string) {
    const data = await this.request<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; fullName: string; username: string; role: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return {
      token: data.accessToken,
      refreshToken: data.refreshToken,
      user: normalizeUser(data.user),
    };
  }

  async logout() {
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refresh }),
      }).catch(() => {});
    }
    this.setToken(null);
    localStorage.removeItem('refreshToken');
  }

  async getCurrentUser(): Promise<User> {
    const data = await this.request<{
      id: string;
      full_name: string;
      username: string;
      role_name: string;
      permissions: string[];
      phone?: string;
    }>('/auth/me');
    return normalizeUser(data);
  }

  // Bobins
  async getBobins(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<PaginatedResponse<Bobin>>(`/bobins${q}`);
  }

  async getBobinStock() {
    return this.request<Record<string, unknown>[]>('/bobins/stock/summary');
  }

  async createBobin(body: Record<string, unknown>) {
    return this.request<Bobin>('/bobins', { method: 'POST', body: JSON.stringify(body) });
  }

  async getBobinByQr(qrCode: string) {
    return this.request<Bobin>(`/bobins/qr/${encodeURIComponent(qrCode)}`);
  }

  // Clay
  async getClayBalance() {
    return this.request<{ current_stock_kg: number; bag_weight_kg: number }>('/clay/balance');
  }

  async receiveClay(body: { quantityKg?: number; quantityBags?: number; notes?: string }) {
    return this.request('/clay/receive', { method: 'POST', body: JSON.stringify(body) });
  }

  async getClayTransactions(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<PaginatedResponse<Record<string, unknown>>>(`/clay/transactions${q}`);
  }

  // Machines
  async getMachines() {
    return this.request<Record<string, unknown>[]>('/machines');
  }

  // Production
  async getProductionSessions(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<PaginatedResponse<Record<string, unknown>>>(`/production/sessions${q}`);
  }

  async getActiveProductionSessions() {
    return this.request<Record<string, unknown>[]>('/production/sessions/active');
  }

  async startProduction(body: { bobinQrCode: string; machineId: string }) {
    return this.request('/production/sessions/start', { method: 'POST', body: JSON.stringify(body) });
  }

  async addClayToSession(sessionId: string, body: { quantityKg?: number; bags?: number }) {
    return this.request(`/production/sessions/${sessionId}/clay/add`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async finishProduction(
    sessionId: string,
    body: { outputWeightKg: number; bobinRemainingWeightKg: number }
  ) {
    return this.request(`/production/sessions/${sessionId}/finish`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Cutting
  async getCuttingSessions(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<PaginatedResponse<Record<string, unknown>>>(`/cutting/sessions${q}`);
  }

  async startCutting(body: { parentPaperQrCode: string; inputWeightKg: number; machineId?: string }) {
    return this.request('/cutting/sessions/start', { method: 'POST', body: JSON.stringify(body) });
  }

  async getCuttingSession(id: string) {
    return this.request<Record<string, unknown> & { products: Record<string, unknown>[] }>(
      `/cutting/sessions/${id}`
    );
  }

  async addCuttingProduct(
    sessionId: string,
    body: { widthCm: number; weightKg: number; lengthM?: number; color?: string }
  ) {
    return this.request(`/cutting/sessions/${sessionId}/products/add`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async finishCutting(sessionId: string) {
    return this.request(`/cutting/sessions/${sessionId}/finish`, { method: 'POST' });
  }

  // Plots
  async getPlots(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<PaginatedResponse<Record<string, unknown>>>(`/plots${q}`);
  }

  async getActivePlot() {
    return this.request<Record<string, unknown> | null>('/plots/active');
  }

  async createPlot(body: { widthCm: number }) {
    return this.request('/plots', { method: 'POST', body: JSON.stringify(body) });
  }

  async getPlot(id: string) {
    return this.request<Record<string, unknown> & { items: Record<string, unknown>[] }>(`/plots/${id}`);
  }

  async addPlotItem(plotId: string, cutProductId: string) {
    return this.request(`/plots/${plotId}/items/add`, {
      method: 'POST',
      body: JSON.stringify({ cutProductId }),
    });
  }

  async closePlot(plotId: string) {
    return this.request(`/plots/${plotId}/close`, { method: 'POST' });
  }

  // Warehouse
  async getWarehouseProducts(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<PaginatedResponse<Record<string, unknown>>>(`/warehouse/products${q}`);
  }

  async getWarehouseSummary() {
    return this.request<{ summary: Record<string, unknown>[]; total: Record<string, unknown> }>(
      '/warehouse/summary'
    );
  }

  async registerWarehouseProduct(body: {
    widthCm: number;
    weightKg: number;
    color?: string;
    lengthM?: number;
    qrCode?: string;
  }) {
    return this.request('/warehouse/products', { method: 'POST', body: JSON.stringify(body) });
  }

  // Shipments
  async getShipments(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<PaginatedResponse<Record<string, unknown>>>(`/shipments${q}`);
  }

  async createShipment(body: { destination?: string; customerName?: string; notes?: string }) {
    return this.request('/shipments', { method: 'POST', body: JSON.stringify(body) });
  }

  async getShipment(id: string) {
    return this.request<Record<string, unknown> & { items: Record<string, unknown>[] }>(
      `/shipments/${id}`
    );
  }

  async scanShipmentItem(shipmentId: string, qrCode: string) {
    return this.request(`/shipments/${shipmentId}/scan`, {
      method: 'POST',
      body: JSON.stringify({ qrCode }),
    });
  }

  async finishShipment(shipmentId: string) {
    return this.request(`/shipments/${shipmentId}/finish`, { method: 'POST' });
  }

  // Analytics
  async getDashboard() {
    return this.request<Record<string, unknown>>('/analytics/dashboard');
  }

  async getCostReports(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<Record<string, unknown>[]>(`/analytics/cost-report${q}`);
  }

  async getWasteReports(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<Record<string, unknown>[]>(`/analytics/waste-report${q}`);
  }

  async getInventoryAnalytics() {
    return this.request<Record<string, unknown>>('/analytics/inventory');
  }

  // Users
  async getUsers(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<PaginatedResponse<Record<string, unknown>>>(`/users${q}`);
  }

  // QR
  async scanQr(qrCode: string) {
    return this.request<{
      type: string;
      id: string;
      data: Record<string, unknown>;
      allowedActions: string[];
    }>(`/qr/scan/${encodeURIComponent(qrCode)}`);
  }
}

function normalizeUser(raw: Record<string, unknown>): User {
  return {
    id: String(raw.id),
    username: String(raw.username || ''),
    name: String(raw.full_name || raw.fullName || raw.name || raw.username || ''),
    role: (raw.role_name || raw.role || 'direktor') as User['role'],
    permissions: (raw.permissions as string[]) || [],
    phone: raw.phone as string | undefined,
  };
}

export const apiClient = new ApiClient();
export default apiClient;
