export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string[]>;
}

export interface AuthContext {
  userId: string;
  role: string; // "OWNER" | "SUCURSAL_USER"
  branchId: string | null;
  name: string;
  email: string;
  transport: "bearer" | "cookie";
}

export type AuthSession = AuthContext;

export interface MobileJwtPayload {
  id: string;
  role: string; // "OWNER" | "SUCURSAL_USER"
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
