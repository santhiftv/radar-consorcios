/** Rótulos em português para estados exibidos na interface. */
export const LEAD_STATUS: Record<string, string> = {
  open: 'Disponível',
  assigned: 'Atribuído',
  contacted: 'Contatado',
  converted: 'Venda informada',
  lost: 'Sem negócio',
  expired_unclaimed: 'Expirado',
  invalid: 'Inválido',
  withdrawn: 'Retirado pelo titular',
};

export const ASSIGNMENT_STATUS: Record<string, string> = {
  active: 'Aguardando contato',
  contacted: 'Contatado',
  converted: 'Venda informada',
  lost: 'Sem negócio',
  expired: 'Expirado (sem contato no prazo)',
  released: 'Liberado (titular revogou)',
  invalidated: 'Invalidado (contestação aceita)',
};

export const CLAIM_RESULT: Record<string, string> = {
  won: 'Venceu',
  already_taken: 'Já reivindicado por outro',
  not_eligible: 'Não elegível',
  priority_window: 'Janela de prioridade',
  quota_exceeded: 'Saldo esgotado',
  subscription_inactive: 'Assinatura inativa',
  rate_limited: 'Limite de tentativas',
  not_found: 'Não encontrado',
  profile_blocked: 'Perfil bloqueado',
};

export const SUBSCRIPTION_STATUS: Record<string, string> = {
  pending: 'Pagamento pendente',
  active: 'Ativa',
  past_due: 'Pagamento em atraso (carência)',
  paused: 'Pausada',
  canceled: 'Cancelada',
  expired: 'Expirada',
  rejected: 'Pagamento recusado',
};

export const VERIFICATION_STATUS: Record<string, string> = {
  pending: 'Em verificação',
  verified: 'Verificado',
  rejected: 'Recusado',
  suspended: 'Suspenso',
  revoked: 'Revogado',
};

export const CONTEST_REASONS: Record<string, string> = {
  invalid_phone: 'Telefone inválido ou inexistente',
  invalid_email: 'E-mail inválido',
  duplicate: 'Lead duplicado',
  did_not_request: 'Titular afirma não ter solicitado',
  wrong_region: 'Região incompatível',
  other: 'Outro motivo',
};

export const CONTEST_STATUS: Record<string, string> = { open: 'Em análise', accepted: 'Aceita', rejected: 'Recusada' };

export const PRIVACY_STATUS: Record<string, string> = {
  awaiting_confirmation: 'Aguardando confirmação do titular',
  open: 'Aberta',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  rejected: 'Recusada',
  expired: 'Expirada',
};
