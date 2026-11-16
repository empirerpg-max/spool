/**
 * "Publicações" tab of a profile. Placeholder until posts exist (plan 7, Task 4 fills it with PostCards).
 */
export function ProfilePosts({ isMe }: { profileId: string; isMe: boolean }) {
  return (
    <p className="text-muted">
      {isMe ? 'Você ainda não publicou nada.' : 'Nenhuma publicação ainda.'}
    </p>
  );
}
