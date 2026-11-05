/**
 * Templates de e-mail transacional. Regra: e-mails de novo lead NUNCA contêm
 * telefone, e-mail ou nome do consumidor — apenas o resumo e um link para o
 * painel autenticado.
 */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

interface LayoutArgs {
  brand: string;
  title: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footer?: string;
}

export function layout({ brand, title, paragraphs, cta, footer }: LayoutArgs): { html: string; text: string } {
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0B1F3A;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:bold">${escapeHtml(brand)}</td></tr>
<tr><td style="padding:24px">
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
${paragraphs.map((p) => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">${escapeHtml(p)}</p>`).join('\n')}
${cta ? `<p style="margin:20px 0"><a href="${escapeHtml(cta.url)}" style="background:#1F9D6B;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold;display:inline-block">${escapeHtml(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 24px;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0">${escapeHtml(footer ?? 'Você recebe este e-mail por ter uma conta na plataforma. Ajuste suas preferências de notificação no painel.')}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [title, '', ...paragraphs, ...(cta ? ['', `${cta.label}: ${cta.url}`] : []), '', footer ?? ''].join('\n');
  return { html, text };
}

export interface NotificationEmailInput {
  brand: string;
  siteUrl: string;
  type: string;
  title: string;
  body: string;
  leadId?: string | null;
}

/** E-mail genérico a partir de uma notificação já sanitizada no banco. */
export function notificationEmail(n: NotificationEmailInput): { subject: string; html: string; text: string } {
  const link =
    n.type === 'new_lead'
      ? `${n.siteUrl}/painel/novos-leads${n.leadId ? `?lead=${encodeURIComponent(n.leadId)}` : ''}`
      : n.type === 'editorial_review'
        ? `${n.siteUrl}/admin/blog`
        : n.type === 'payment' || n.type === 'subscription'
          ? `${n.siteUrl}/painel/assinatura`
          : `${n.siteUrl}/painel`;
  const paragraphs =
    n.type === 'new_lead'
      ? [n.body, 'Os dados de contato ficam disponíveis apenas no painel, para quem concluir a reivindicação primeiro.']
      : [n.body];
  const { html, text } = layout({
    brand: n.brand,
    title: n.title,
    paragraphs,
    cta: { label: n.type === 'new_lead' ? 'Ver oportunidade no painel' : 'Abrir o painel', url: link },
  });
  return { subject: `${n.title} — ${n.brand}`, html, text };
}

export function privacyConfirmationEmail(args: { brand: string; confirmUrl: string; requestLabel: string }) {
  const { html, text } = layout({
    brand: args.brand,
    title: 'Confirme sua solicitação de privacidade',
    paragraphs: [
      `Recebemos uma solicitação de "${args.requestLabel}" associada a este e-mail.`,
      'Para proteger seus dados, precisamos confirmar que foi você. O link expira em 48 horas.',
      'Se você não fez esta solicitação, ignore este e-mail.',
    ],
    cta: { label: 'Confirmar solicitação', url: args.confirmUrl },
    footer: 'Mensagem enviada para atender a uma solicitação de direitos do titular (LGPD).',
  });
  return { subject: `Confirme sua solicitação — ${args.brand}`, html, text };
}

export function leadReceivedEmail(args: { brand: string; siteUrl: string; firstName: string; maxConsultants: number }) {
  const { html, text } = layout({
    brand: args.brand,
    title: 'Recebemos sua solicitação de propostas',
    paragraphs: [
      `Olá, ${args.firstName}. Sua solicitação foi registrada.`,
      `Um consultor parceiro compatível com sua região e modalidade poderá entrar em contato pelo canal escolhido. No máximo ${args.maxConsultants} consultor(es), um de cada vez, receberão seus dados.`,
      'As condições reais (parcelas, taxas e prazos) são definidas pela administradora e pelo grupo. Não há garantia de contemplação.',
      'Você pode interromper o compartilhamento ou pedir a exclusão dos seus dados a qualquer momento.',
    ],
    cta: { label: 'Gerenciar meus dados', url: `${args.siteUrl}/privacidade/solicitacoes` },
    footer: 'Você recebeu este e-mail porque solicitou propostas na plataforma.',
  });
  return { subject: `Solicitação recebida — ${args.brand}`, html, text };
}
