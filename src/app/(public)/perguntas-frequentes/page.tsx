import type { Metadata } from 'next';
import { consultantFaq, consumerFaq } from '@/content/faq';
import { Disclaimers, FaqList, JsonLd } from '@/components/content-blocks';
import { faqJsonLd } from '@/lib/domain/seo';

export const metadata: Metadata = {
  title: 'Perguntas frequentes',
  description: 'Dúvidas sobre simulação, contemplação, compartilhamento de dados e planos para consultores.',
  alternates: { canonical: '/perguntas-frequentes' },
};

export default function FaqPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <JsonLd data={faqJsonLd([...consumerFaq, ...consultantFaq])} />
      <h1 className="text-3xl font-extrabold sm:text-4xl">Perguntas frequentes</h1>
      <h2 className="mt-10 text-xl font-bold">Para quem procura consórcio</h2>
      <div className="mt-4"><FaqList items={consumerFaq} /></div>
      <h2 className="mt-10 text-xl font-bold">Para consultores</h2>
      <div className="mt-4"><FaqList items={consultantFaq} /></div>
      <div className="mt-10"><Disclaimers /></div>
    </div>
  );
}
