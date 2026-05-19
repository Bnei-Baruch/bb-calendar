import { Outlet, Navigate } from 'react-router';
import keycloak from '../../keycloak';

export function isAdmin(): boolean {
  const roles: string[] = keycloak.tokenParsed?.realm_access?.roles ?? [];
  return roles.includes('events_admin');
}

export function isTranslator(): boolean {
  const roles: string[] = keycloak.tokenParsed?.realm_access?.roles ?? [];
  return roles.includes('events_translator');
}

export function isAdminOrTranslator(): boolean {
  return isAdmin() || isTranslator();
}

export function AdminGuard() {
  if (!keycloak.authenticated) return <Navigate to="/" replace />;
  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        403 — Admin access required
      </div>
    );
  }
  return <Outlet />;
}
