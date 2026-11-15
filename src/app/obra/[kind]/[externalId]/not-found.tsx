import Link from 'next/link';

export default function WorkNotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Obra não encontrada</h1>
      <p className="text-neutral-500">Não achamos esse filme, série ou livro.</p>
      <Link href="/" className="underline">Voltar para a busca</Link>
    </div>
  );
}
