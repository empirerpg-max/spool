'use client';

import { useState, useTransition } from 'react';
import { deletePost, deleteReply } from '@/lib/social/actions';

function DeleteButton({ question, run }: { question: string; run: () => Promise<{ error?: string } | void> }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <button type="button" disabled={pending} className="text-muted hover:text-danger hover:underline disabled:opacity-60"
        onClick={() => {
          if (!window.confirm(question)) return;
          startTransition(async () => { const r = await run(); setError(r?.error ?? null); });
        }}>
        Apagar
      </button>
      {error && <span role="alert" className="text-danger">{error}</span>}
    </span>
  );
}

export function DeletePostButton({ postId }: { postId: string }) {
  return <DeleteButton question="Apagar esta publicação? As respostas somem junto." run={() => deletePost(postId)} />;
}

export function DeleteReplyButton({ replyId, postId }: { replyId: string; postId: string }) {
  return <DeleteButton question="Apagar esta resposta?" run={() => deleteReply(replyId, postId)} />;
}
