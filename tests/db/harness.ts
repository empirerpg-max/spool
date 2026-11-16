/**
 * Real-Postgres harness for database tests. Mimics the bits of Supabase our
 * migrations rely on: roles anon/authenticated, auth.users, auth.uid() and
 * Supabase's default grants on the public schema.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { expect } from 'vitest';

const url = process.env.TEST_DATABASE_URL;
export const hasDb = Boolean(url);
const pool = url ? new Pool({ connectionString: url, max: 2 }) : null;

const MIGRATIONS = path.resolve(__dirname, '../../supabase/migrations');

const SUPABASE_STUB = `
drop schema if exists public cascade;
drop schema if exists auth cascade;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema public;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade);
create table auth.refresh_tokens (id bigserial primary key, user_id text, session_id uuid);
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
grant usage on schema public to service_role;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
`;

function db(): Pool {
  if (!pool) throw new Error('TEST_DATABASE_URL não definido');
  return pool;
}

export async function resetDatabase(): Promise<void> {
  const c = await db().connect();
  try {
    await c.query(SUPABASE_STUB);
    for (const f of readdirSync(MIGRATIONS).filter((n) => n.endsWith('.sql')).sort()) {
      await c.query(readFileSync(path.join(MIGRATIONS, f), 'utf8'));
    }
  } finally {
    c.release();
  }
}

async function tx<T>(setup: (c: PoolClient) => Promise<void>, sql: string, params: unknown[]): Promise<T[]> {
  const c = await db().connect();
  try {
    await c.query('begin');
    await setup(c);
    const r = await c.query(sql, params);
    await c.query('commit');
    return r.rows as T[];
  } catch (e) {
    await c.query('rollback');
    throw e;
  } finally {
    c.release();
  }
}

export function asSuperuser<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return tx<T>(async () => {}, sql, params);
}

export function asServiceRole<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return tx<T>(async (c) => {
    await c.query('set local role service_role');
  }, sql, params);
}

export function asAnon<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return tx<T>(async (c) => {
    await c.query('set local role anon');
  }, sql, params);
}

export function asUser<T = Record<string, unknown>>(userId: string, sql: string, params: unknown[] = []): Promise<T[]> {
  return tx<T>(async (c) => {
    await c.query('set local role authenticated');
    await c.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
  }, sql, params);
}

export type SignupMeta = Partial<{ first_name: string; last_name: string; birth_date: string; terms_version: string; invite_code: string }>;

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const randomCode = () => Array.from({ length: 8 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

/** Inserts an auth user the way Supabase sign-up does: personal data and invite in raw_user_meta_data. */
export async function signUpRaw(email: string, meta: SignupMeta | null): Promise<string> {
  const [row] = await asSuperuser<{ id: string }>(
    "insert into auth.users(email, raw_user_meta_data) values ($1, coalesce($2::jsonb, '{}'::jsonb)) returning id",
    [email, meta ? JSON.stringify(meta) : null],
  );
  return row.id;
}

/** A regular, valid sign-up with a fresh invite (so tests don't depend on the first-account bootstrap). */
export async function createUser(email: string, meta: SignupMeta = {}): Promise<string> {
  const code = meta.invite_code ?? randomCode();
  if (!meta.invite_code) await asSuperuser('insert into invites(code) values ($1)', [code]);
  return signUpRaw(email, {
    first_name: 'Teste', last_name: 'Silva', birth_date: '1990-01-01', terms_version: '2026-11-16', ...meta, invite_code: code,
  });
}

export async function expectDbError(p: Promise<unknown>, message: string | RegExp): Promise<void> {
  await expect(p).rejects.toThrow(message);
}
