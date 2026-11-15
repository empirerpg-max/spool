export function Trailer({ youtubeKey }: { youtubeKey: string | null }) {
  if (!youtubeKey) return null;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeKey}`}
        title="Trailer"
        loading="lazy"
        allow="encrypted-media; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}
