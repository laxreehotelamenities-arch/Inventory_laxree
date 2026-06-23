/**
 * Authentication utilities (client-side only — demo app)
 * In production, replace with NextAuth / server-side auth.
 */
'use client';

import usersData from '@/data/users.json';
import type { AppUser, Role, RoleConfig } from './types';

interface UsersFile {
  users: Array<Omit<AppUser, 'role'> & { role: Role }>;
  roleConfig: Record<Role, RoleConfig>;
}

const data = usersData as unknown as UsersFile;

export const USERS: AppUser[] = data.users;
export const ROLE_CONFIG: Record<Role, RoleConfig> = data.roleConfig;

export function authenticate(username: string, password: string): AppUser | null {
  const user = USERS.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  if (!user) return null;
  // Strip password before returning (password isn't on AppUser type anyway)
  const { ...safeUser } = user;
  return safeUser;
}

export function getRoleConfig(role: Role): RoleConfig {
  return ROLE_CONFIG[role];
}

// Demo credentials display helper — REMOVED for security.
// Admin will receive credentials directly from the system administrator.
export const DEMO_CREDENTIALS: { role: Role; username: string; password: string }[] = [];
