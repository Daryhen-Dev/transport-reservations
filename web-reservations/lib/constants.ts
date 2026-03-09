export const ROUTES = {
  LOGIN: "/login",
  SUPER_ADMIN_BASE: "/super-admin",
  SUPER_ADMIN_DASHBOARD: "/super-admin/dashboard",
  agencyLogin: (slug: string) => `/${slug}/login`,
  agencyDashboard: (slug: string) => `/${slug}/dashboard`,
  agencySucursales: (slug: string) => `/${slug}/sucursales`,
} as const;
