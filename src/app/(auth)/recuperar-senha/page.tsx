import { ResetRequestForm } from '@/components/auth-forms';

export const metadata = { title: 'Recuperar senha' };

export default function RecuperarSenhaPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Recuperar senha</h1>
      <p className="mt-1 text-sm text-muted">Enviaremos um link para você criar uma nova senha.</p>
      <div className="mt-6"><ResetRequestForm /></div>
    </>
  );
}
