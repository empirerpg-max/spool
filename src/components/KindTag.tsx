import type { WorkKind } from '@/lib/catalog/types';
import { KIND_LABEL, kindBgClass } from '@/lib/kind-style';

export function KindTag({ kind }: { kind: WorkKind }) {
  return (
    <span className={`${kindBgClass(kind)} inline-block rounded px-1.5 py-px text-[0.68rem] font-extrabold uppercase tracking-wider text-bg`}>
      {KIND_LABEL[kind]}
    </span>
  );
}
