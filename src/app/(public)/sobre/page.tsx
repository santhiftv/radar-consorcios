import type { Metadata } from 'next';
import { Disclaimers } from '@/components/content-blocks';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = { title: 'Sobre a plataforma', alternates: { canonical: '/sobre' } };

export default function SobrePage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Sobre o {siteConfig.name}</h1>
      <div className="prose-article mt-6">
        <p>
          O {siteConfig.name} nasceu para tornar o planejamento de um consórcio mais claro. Reunimos conteúdo educativo com fontes indicadas, um simulador ilustrativo transparente e uma forma organizada de conectar quem procura consórcio a consultores independentes.
        </p>
        <h2>O que fazemos</h2>
        <ul>
          <li>Publicamos guias e análises revisados por pessoas antes da publicação.</li>
          <li>Oferecemos simulação com cenários genéricos, sem inventar taxas de administradoras.</li>
          <li>Encaminhamos pedidos de propostas somente com autorização do titular, para um consultor por vez.</li>
        </ul>
        <h2>O que não fazemos</h2>
        <ul>
          <li>Não somos administradora de consórcio nem vendemos cotas.</li>
          <li>Não prometemos contemplação, aprovação ou condições específicas.</li>
          <li>Não compramos, raspamos ou usamos bases de contatos sem autorização.</li>
        </ul>
        <h2>Quem está por trás</h2>
        <p>{siteConfig.company.legalName} · CNPJ {siteConfig.company.cnpj} · {siteConfig.company.city}.</p>
      </div>
      <div className="mt-8"><Disclaimers /></div>
    </div>
  );
}
