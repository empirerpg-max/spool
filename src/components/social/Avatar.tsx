type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, string> = { sm: 'size-8 text-sm', md: 'size-12 text-lg', lg: 'size-24 text-4xl' };

const initial = (name: string) => name.match(/\p{L}|\p{N}/u)?.[0]?.toUpperCase() ?? '?';

/** Round profile photo, or the first letter of the name when there is no photo. */
export function Avatar({ url, name, size = 'md' }: { url: string | null; name: string; size?: Size }) {
  const box = `${SIZES[size]} shrink-0 rounded-full`;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${box} border border-line bg-surface-2 object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${box} flex items-center justify-center border border-line bg-surface-2 font-display font-bold text-muted`}>
      {initial(name)}
    </span>
  );
}
