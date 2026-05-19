export type UserRole =
  | 'super_admin'
  | 'omborchi'
  | 'mashina_operatori'
  | 'kesuvchi_ishchi'
  | 'direktor';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  permissions: string[];
  phone?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Bobin {
  id: string;
  qr_code: string;
  grammaj: number;
  color: string;
  initial_weight_kg: number;
  current_weight_kg: number;
  initial_length_m: number;
  current_length_m: number;
  width_mm?: number;
  status: 'omborxonada' | 'mashinada' | 'ishlatilgan' | 'qaytarilgan';
  supplier_name?: string;
  batch_number?: string;
  created_at: string;
}

// Legacy aliases for gradual migration
export type Product = Bobin;
export interface ProductionOrder {
  id: string;
  session_code?: string;
  orderNumber?: string;
  status: string;
  started_at?: string;
  startDate?: string;
  bobin_used_kg?: number;
  output_weight_kg?: number;
}

export interface Employee {
  id: string;
  full_name?: string;
  name?: string;
  username: string;
  role_name?: string;
  role?: string;
  is_active?: boolean;
  phone?: string;
}

export interface Permission {
  resource: string;
  actions: string[];
}

export type RolePermissions = Record<UserRole, Permission[]>;
