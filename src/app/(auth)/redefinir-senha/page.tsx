import { redirect } from 'next/navigation';
import { UpdatePasswordForm } from '@/components/auth-forms';
import { getOptionalUser } from '@/lib/auth/guards';

export const metadata = { title: 'Redefinir senha' };
export const dynamic = 'force-dynamic';

export default async function RedefinirSenhaPage() {
  const user = await getOptionalUser();
  if (!user) redirect('/entrar?erro=link');
  return (
    <>
      <h1 className="text-2xl font-bold">Criar nova senha</h1>
      <div className="mt-6"><UpdatePasswordForm /></div>
    </>
  );
}
