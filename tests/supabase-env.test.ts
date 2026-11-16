import { describe, it, expect, afterEach } from 'vitest';
import { supabaseUrl, normalizeSupabaseUrl } from '@/lib/supabase/env';

describe('normalizeSupabaseUrl', () => {
  it.each([
    ['https://abc.supabase.co', 'https://abc.supabase.co'],
    ['https://abc.supabase.co/', 'https://abc.supabase.co'],
    ['https://abc.supabase.co/rest/v1/', 'https://abc.supabase.co'],
    ['https://abc.supabase.co/rest/v1', 'https://abc.supabase.co'],
    [' https://abc.supabase.co/auth/v1 ', 'https://abc.supabase.co'],
    ['', ''],
  ])('%s → %s', (input, expected) => expect(normalizeSupabaseUrl(input)).toBe(expected));
});

describe('supabaseUrl', () => {
  const saved = process.env.NEXT_PUBLIC_SUPABASE_URL;
  afterEach(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = saved; });
  it('cleans the configured value', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co/rest/v1/';
    expect(supabaseUrl()).toBe('https://abc.supabase.co');
  });
});
