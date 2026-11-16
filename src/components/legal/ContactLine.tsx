/** The contact channel for requests (LGPD, appeals, account deletion). Set NEXT_PUBLIC_CONTACT_EMAIL on Vercel. */
export function ContactLine() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return email ? (
    <span>pelo e-mail <strong className="select-all">{email}</strong></span>
  ) : (
    <span>pelo e-mail de contato que será publicado aqui antes da abertura do Lobby ao público</span>
  );
}
