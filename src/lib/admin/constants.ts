export const ADMIN_ROLES = ['super_admin', 'editor', 'viewer'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
