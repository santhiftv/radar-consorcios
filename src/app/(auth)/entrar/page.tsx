import { SignInForm } from '@/components/auth-forms';

export const metadata = { title: 'Entrar' };

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-1 text-sm text-muted">Área do consultor e da equipe.</p>
      {erro === 'link' && <p className="mt-4 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">O link expirou ou já foi usado. Entre ou solicite um novo.</p>}
      <div className="mt-6"><SignInForm next={next} /></div>
    </>
  );
}
