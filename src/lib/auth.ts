/**
 * Authentication utilities (client-side only — demo app)
 * In production, replace with NextAuth / server-side auth.
 */
'use client';

import usersData from '@/data/users.json';
import type { AppUser, Role, RoleConfig } from './types';

interface UserRecord extends AppUser {
  password: string; // only present in the JSON file, stripped before returning
}

interface UsersFile {
  users: UserRecord[];
  roleConfig: Record<Role, RoleConfig>;
}

const data = usersData as unknown as UsersFile;

// Public list of users — passwords stripped for safety.
export const USERS: AppUser[] = data.users.map(({ password: _pw, ...safe }) => safe);
export const ROLE_CONFIG: Record<Role, RoleConfig> = data.roleConfig;

export function authenticate(username: string, password: string): AppUser | null {
  const user = data.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  if (!user) return null;
  // Strip password before returning
  const { password: _pw, ...safeUser } = user;
  return safeUser;
}

export function getRoleConfig(role: Role): RoleConfig {
  return ROLE_CONFIG[role];
}

// Demo credentials display helper — REMOVED for security.
export const DEMO_CREDENTIALS: { role: Role; username: string; password: string }[] = [];
