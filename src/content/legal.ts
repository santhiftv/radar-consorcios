/**
 * TEXTOS LEGAIS — RASCUNHOS TÉCNICOS PARA REVISÃO JURÍDICA ANTES DO LANÇAMENTO.
 * Não constituem aconselhamento jurídico. Campos entre colchetes precisam ser
 * preenchidos. Ao alterar o aviso de privacidade, atualize a versão aqui E em
 * app_settings.privacy_notice_version (o banco rejeita versões divergentes).
 */
import { siteConfig } from '../config/site';

export const PRIVACY_NOTICE_VERSION = '2026-10-25.1';
export const CONSULTANT_TERMS_VERSION = '2026-10-25.1';
export const MAX_CONSULTANTS_PER_LEAD = 2; // 1 atribuição + até 1 redistribuição (lead_max_redistributions)

/** Aviso curto exibido ANTES do envio do formulário de propostas. */
export const privacyNotice = {
  version: PRIVACY_NOTICE_VERSION,
  title: 'Como seus dados serão usados',
  items: [
    `Quem trata os dados: ${siteConfig.company.legalName} (${siteConfig.name}), CNPJ ${siteConfig.company.cnpj}.`,
    'Para quê: registrar seu pedido e encaminhá-lo a um consultor de consórcio independente, assinante da plataforma, compatível com sua cidade, modalidade e faixa de valores, para que ele entre em contato e apresente propostas.',
    `Compartilhamento: nome, e-mail, telefone, cidade/bairro e as preferências informadas são liberados a um consultor por vez — no máximo ${MAX_CONSULTANTS_PER_LEAD} consultores, caso o primeiro não faça contato no prazo. Consultores veem só um resumo (sem contato) até concluírem a reivindicação.`,
    'Os consultores atuam com as administradoras com as quais têm vínculo; a plataforma não é administradora de consórcio e não garante aprovação, condições ou contemplação.',
    'Comunicações promocionais recorrentes são opcionais e dependem de autorização separada.',
    'Retenção: os dados de contato são anonimizados após 12 meses, ou antes, se você pedir exclusão (salvo obrigação legal).',
    'Seus direitos: acesso, correção, exclusão, informação sobre compartilhamento, revogação da autorização e interrupção de comunicações, em "Privacidade e meus dados".',
    `Encarregado (DPO): ${siteConfig.company.dpoEmail}.`,
  ],
  shareLabel:
    'Autorizo o compartilhamento dos meus dados com um consultor parceiro compatível (até 2, um de cada vez) para receber contato e propostas sobre consórcio.',
  marketingLabel: 'Quero receber conteúdos e ofertas da plataforma por e-mail (opcional, posso cancelar quando quiser).',
};

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export const privacyPolicy: { updatedAt: string; sections: LegalSection[] } = {
  updatedAt: '25/10/2026',
  sections: [
    {
      heading: '1. Quem somos',
      paragraphs: [
        `${siteConfig.company.legalName}, inscrita no CNPJ ${siteConfig.company.cnpj}, com sede em ${siteConfig.company.city}, é a controladora dos dados tratados na plataforma ${siteConfig.name}. Encarregado: ${siteConfig.company.dpoEmail}.`,
      ],
    },
    {
      heading: '2. Dados que tratamos',
      paragraphs: [
        'Visitantes que solicitam propostas: nome, e-mail, telefone, cidade, estado, bairro (opcional), modalidade, faixas de crédito e parcela, prazo pretendido, horário e canal de contato preferidos, administradora preferida (opcional), registros de autorização (versão do aviso, data, hora, origem) e dados técnicos mínimos (endereço IP armazenado apenas como hash).',
        'Consultores: nome, e-mail, telefone profissional, cidade/UF, empresa (opcional), referência profissional informada, administradoras com que declara atuar, preferências de atendimento, dados de assinatura (status, plano, período). Dados de cartão são tratados exclusivamente pelo provedor de pagamento.',
        'Não coletamos dados por raspagem de perfis, bases vazadas ou fontes sem autorização.',
      ],
    },
    {
      heading: '3. Finalidades e bases legais (a validar juridicamente)',
      paragraphs: [
        'Encaminhar seu pedido de propostas a consultor compatível: consentimento do titular (art. 7º, I, LGPD), registrado de forma destacada e revogável.',
        'Comunicações promocionais recorrentes: consentimento específico e separado.',
        'Gestão da conta e da assinatura de consultores: execução de contrato (art. 7º, V).',
        'Prevenção a fraudes, segurança e auditoria: legítimo interesse (art. 7º, IX), com avaliação documentada.',
        'Cumprimento de obrigações legais e regulatórias e exercício regular de direitos (art. 7º, II e VI).',
      ],
    },
    {
      heading: '4. Compartilhamento',
      paragraphs: [
        `Com consultores assinantes, apenas após sua autorização, um por vez e no máximo ${MAX_CONSULTANTS_PER_LEAD}. Cada consultor é responsável pelo uso que fizer dos dados para o contato solicitado e se compromete contratualmente a não usá-los para outras finalidades.`,
        'Com operadores que viabilizam a plataforma: hospedagem e banco de dados, envio de e-mails, processamento de pagamentos e, se habilitados, análise de audiência e monitoramento de erros.',
        'Não vendemos dados pessoais.',
      ],
    },
    {
      heading: '5. Retenção e descarte',
      paragraphs: [
        'Dados de contato de solicitações: anonimizados após 12 meses. Registros de autorização e auditoria: mantidos pelo prazo necessário para comprovar o cumprimento da LGPD e para defesa em processos. Um hash do e-mail pode ser mantido em lista de supressão para respeitar pedidos de não contato.',
      ],
    },
    {
      heading: '6. Seus direitos',
      paragraphs: [
        'Você pode solicitar confirmação de tratamento, acesso, correção, anonimização ou exclusão, portabilidade, informação sobre compartilhamentos, revogação de consentimento e oposição, na página "Privacidade e meus dados". Por segurança, confirmamos a solicitação pelo e-mail informado. Respondemos em até 15 dias.',
      ],
    },
    {
      heading: '7. Segurança',
      paragraphs: [
        'Adotamos controle de acesso por função, isolamento de dados por conta no banco (Row Level Security), criptografia em trânsito, registros de auditoria imutáveis, minimização e pseudonimização. Incidentes relevantes serão comunicados à ANPD e aos titulares quando exigido.',
      ],
    },
    {
      heading: '8. Cookies',
      paragraphs: ['Consulte a Política de Cookies. Cookies não essenciais só são usados com sua autorização.'],
    },
  ],
};

export const termsOfUse: { updatedAt: string; sections: LegalSection[] } = {
  updatedAt: '25/10/2026',
  sections: [
    {
      heading: '1. Natureza do serviço',
      paragraphs: [
        `${siteConfig.name} é uma plataforma de conteúdo educativo, simulação ilustrativa e intermediação de contatos entre interessados em consórcio e consultores independentes. Não é administradora de consórcio, não comercializa cotas e não garante contemplação, aprovação, taxas ou condições.`,
        siteConfig.disclaimers.independence,
      ],
    },
    {
      heading: '2. Simulações e conteúdo',
      paragraphs: [
        siteConfig.disclaimers.simulation,
        'Os artigos têm finalidade educativa, indicam fontes e são revisados por pessoas antes da publicação. Eles não substituem a leitura do contrato e do regulamento do grupo.',
      ],
    },
    {
      heading: '3. Responsabilidades do usuário',
      paragraphs: ['Informar dados verdadeiros e próprios. É proibido cadastrar dados de terceiros sem autorização, automatizar envios ou tentar burlar mecanismos de segurança.'],
    },
    {
      heading: '4. Consultores assinantes',
      paragraphs: [
        'O uso da área do consultor está sujeito aos Termos do Consultor, aceitos no cadastro, que tratam de assinatura, limites, distribuição de oportunidades, contestação de leads e obrigações de proteção de dados.',
      ],
    },
    {
      heading: '5. Foro e legislação',
      paragraphs: ['Aplica-se a legislação brasileira, inclusive o Código de Defesa do Consumidor quando cabível. Foro: [definir].'],
    },
  ],
};

export const consultantTerms: { version: string; sections: LegalSection[] } = {
  version: CONSULTANT_TERMS_VERSION,
  sections: [
    {
      heading: 'Assinatura e renovação',
      paragraphs: [
        'A assinatura é mensal, renovada automaticamente pelo provedor de pagamento até o cancelamento. O acesso pago é liberado somente após a confirmação do pagamento pelo provedor (webhook). Em caso de falha na renovação, há carência de 3 dias; depois, o acesso às oportunidades é suspenso.',
        'O cancelamento interrompe as renovações futuras; o acesso permanece até o fim do ciclo pago, conforme a política comercial [validar regra de reembolso/arrependimento com o jurídico].',
      ],
    },
    {
      heading: 'Limites e disponibilidade',
      paragraphs: [
        'O limite do plano é o máximo de reivindicações por ciclo mensal, condicionado à disponibilidade real de oportunidades compatíveis. Não há promessa de quantidade diária ou mensal de leads, nem garantia de vendas.',
        'Alterações de preço e limite comunicadas pela plataforma passam a valer na renovação seguinte.',
      ],
    },
    {
      heading: 'Distribuição e prioridade',
      paragraphs: [
        'As oportunidades são liberadas por janela de prioridade transparente (descrita na página de planos). Dentro da janela, recebe a oportunidade quem concluir primeiro uma reivindicação válida; a atribuição é feita de forma atômica pelo servidor.',
        'Após reivindicar, o consultor deve registrar o contato no painel em até 24 horas. Sem registro, a atribuição expira, a oportunidade pode ser redistribuída uma vez e a reivindicação não é devolvida.',
      ],
    },
    {
      heading: 'Contestação de leads',
      paragraphs: [
        'Leads com telefone/e-mail inválidos, duplicados, de região incompatível ou cujo titular nega ter solicitado podem ser contestados em até 7 dias. Contestações aceitas devolvem a reivindicação ao saldo do ciclo.',
      ],
    },
    {
      heading: 'Proteção de dados',
      paragraphs: [
        'O consultor usará os dados recebidos exclusivamente para o contato solicitado pelo titular, não os repassará a terceiros, interromperá o contato quando o titular pedir ou revogar a autorização e adotará medidas de segurança compatíveis. Atuará como [controlador independente/operador — definir com o jurídico] em relação a esses dados.',
        'Uso de robôs, contas múltiplas, compartilhamento de acesso ou qualquer forma de concorrência artificial leva à suspensão da conta.',
      ],
    },
    {
      heading: 'Vínculo com administradoras',
      paragraphs: [
        'O consultor declara apenas as administradoras com as quais possui vínculo válido. A plataforma pode solicitar comprovação e exigir verificação para liberar oportunidades associadas a determinada administradora.',
      ],
    },
  ],
};

export const cookiePolicy: { updatedAt: string; sections: LegalSection[] } = {
  updatedAt: '25/10/2026',
  sections: [
    {
      heading: 'Cookies essenciais',
      paragraphs: ['Necessários para login, segurança e funcionamento do site (sessão do Supabase). Não podem ser desativados.'],
    },
    {
      heading: 'Cookies analíticos (opcionais)',
      paragraphs: [
        'Usados apenas se você autorizar no aviso de cookies, para medir audiência de forma agregada. Você pode mudar sua escolha a qualquer momento no rodapé do site.',
      ],
    },
    {
      heading: 'Publicidade',
      paragraphs: ['Não utilizamos cookies de publicidade comportamental.'],
    },
  ],
};
