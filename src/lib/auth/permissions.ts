/** Espelho da matriz private.admin_role_permissions (fonte da verdade: banco). */
export type AdminRole = 'owner' | 'admin' | 'editor' | 'support' | 'finance';
export type AdminPermission =
  | 'dashboard' | 'leads' | 'consultants' | 'billing' | 'plans' | 'catalog' | 'content'
  | 'notifications' | 'contests' | 'privacy' | 'audit' | 'settings';

export const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[] | '*'> = {
  owner: '*',
  admin: ['dashboard', 'leads', 'consultants', 'billing', 'plans', 'catalog', 'content', 'notifications', 'contests', 'privacy', 'audit', 'settings'],
  editor: ['dashboard', 'content'],
  support: ['dashboard', 'leads', 'consultants', 'contests', 'privacy', 'notifications'],
  finance: ['dashboard', 'billing', 'plans'],
};

export function roleHas(role: AdminRole, permission: AdminPermission): boolean {
  const p = ROLE_PERMISSIONS[role];
  return p === '*' || p.includes(permission);
}

export const ADMIN_TABS: Array<{ href: string; label: string; permission: AdminPermission }> = [
  { href: '/admin', label: 'Dashboard', permission: 'dashboard' },
  { href: '/admin/leads', label: 'Leads', permission: 'leads' },
  { href: '/admin/consultores', label: 'Consultores', permission: 'consultants' },
  { href: '/admin/assinaturas', label: 'Assinaturas e pagamentos', permission: 'billing' },
  { href: '/admin/planos', label: 'Planos e limites', permission: 'plans' },
  { href: '/admin/administradoras', label: 'Administradoras', permission: 'catalog' },
  { href: '/admin/modalidades', label: 'Modalidades', permission: 'catalog' },
  { href: '/admin/regioes', label: 'Regiões', permission: 'catalog' },
  { href: '/admin/blog', label: 'Blog e fila editorial', permission: 'content' },
  { href: '/admin/fontes', label: 'Fontes e referências', permission: 'content' },
  { href: '/admin/notificacoes', label: 'Notificações', permission: 'notifications' },
  { href: '/admin/contestacoes', label: 'Contestações e reposições', permission: 'contests' },
  { href: '/admin/privacidade', label: 'Privacidade e titulares', permission: 'privacy' },
  { href: '/admin/auditoria', label: 'Logs e auditoria', permission: 'audit' },
  { href: '/admin/configuracoes', label: 'Configurações', permission: 'settings' },
];
