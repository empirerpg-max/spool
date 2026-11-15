import { NextResponse, type NextRequest } from 'next/server';
import { createSessionClient } from '@/lib/supabase/session';
import { safeNextPath } from '@/lib/auth/redirect';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get('next'));
  const code = searchParams.get('code');
  if (!code) return NextResponse.redirect(`${origin}/entrar?erro=1`);

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${origin}/entrar?erro=1`);

  const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.user.id).maybeSingle();
  if (!profile?.username) return NextResponse.redirect(`${origin}/bem-vindo?next=${encodeURIComponent(next)}`);
  return NextResponse.redirect(`${origin}${next}`);
}
