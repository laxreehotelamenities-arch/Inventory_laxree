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

// Demo credentials display helper
export const DEMO_CREDENTIALS = [
  { role: 'admin' as Role, username: 'admin', password: 'admin123' },
  { role: 'employee' as Role, username: 'employee', password: 'emp123' },
  { role: 'dealer' as Role, username: 'dealer', password: 'dealer123' },
  { role: 'distributor' as Role, username: 'distributor', password: 'dist123' },
];
