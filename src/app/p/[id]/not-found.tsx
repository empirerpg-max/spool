import Link from 'next/link';

export default function PostNotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Publicação não encontrada</h1>
      <p className="text-muted">Ela pode ter sido apagada ou não está disponível para você.</p>
      <Link href="/" className="underline">Voltar para o início</Link>
    </div>
  );
}
