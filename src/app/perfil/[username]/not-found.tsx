import Link from 'next/link';

export default function ProfileNotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Perfil não encontrado</h1>
      <p className="text-muted">Não achamos ninguém com esse nome de usuário.</p>
      <Link href="/" className="underline">Voltar para o início</Link>
    </div>
  );
}
