/**
 * Configuração institucional centralizada (nome, cores, domínio, textos).
 * Altere aqui para trocar a marca sem mexer nos componentes.
 * Valores que mudam por ambiente vêm de variáveis NEXT_PUBLIC_*.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? 'Consórcio Intel',
  shortName: 'Consórcio Intel',
  tagline: 'Planeje seu consórcio com clareza e receba propostas de consultores',
  description:
    'Simulador ilustrativo de consórcio, conteúdo educativo e solicitação de propostas de consultores independentes. Sem promessas de contemplação.',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  locale: 'pt_BR',
  logo: {
    // Substitua por /brand/logo.svg quando houver logotipo definitivo
    text: 'Consórcio',
    accent: 'Intel',
  },
  colors: {
    navy: '#0B1F3A',
    navySoft: '#14305A',
    green: '#1F9D6B',
    greenSoft: '#E7F6EF',
    ink: '#0F172A',
    paper: '#FFFFFF',
  },
  company: {
    legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME ?? '[RAZÃO SOCIAL — preencher]',
    cnpj: process.env.NEXT_PUBLIC_COMPANY_CNPJ ?? '[CNPJ — preencher]',
    city: process.env.NEXT_PUBLIC_COMPANY_CITY ?? '[Cidade/UF — preencher]',
    contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'contato@seudominio.com.br',
    dpoEmail: process.env.NEXT_PUBLIC_DPO_EMAIL ?? 'privacidade@seudominio.com.br',
  },
  disclaimers: {
    simulation:
      'Simulação ilustrativa com cenários genéricos. Não é proposta, oferta ou promessa de parcela. Valores reais dependem da administradora, do grupo, do prazo, da taxa de administração, do fundo de reserva, de seguros e de outras condições contratuais.',
    contemplation:
      'Consórcio não garante contemplação em data específica. A contemplação ocorre por sorteio ou lance, conforme o regulamento de cada grupo.',
    independence:
      'O Consórcio Intel é uma plataforma independente. Não é administradora de consórcio e não possui parceria oficial com administradoras, salvo quando expressamente informado.',
    subscription:
      'A assinatura dá acesso a oportunidades conforme disponibilidade real. Não há garantia de volume de leads nem de vendas.',
  },
} as const;

export type SiteConfig = typeof siteConfig;
