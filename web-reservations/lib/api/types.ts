export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string[]>;
}

export interface AuthSession {
  userId: string;
  role: string; // 'SUPER_ADMIN' | 'AGENCY_ADMIN' | 'SUCURSAL_USER'
  agencyId: string | null;
  branchId: string | null;
  name: string;
  email: string;
}

export interface MobileJwtPayload {
  id: string;
  role: string;
  branchId?: string | null;
}

export interface MobileLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // always 900 (15 min)
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}
