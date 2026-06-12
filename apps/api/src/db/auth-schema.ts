/**
 * Better Auth-managed tables — `sessions`, `accounts`, `verifications`.
 *
 * These mirror Better Auth 1.6.x's canonical `session` / `account` / `verification`
 * models (verified against the installed package's `getAuthTables`). schema.md calls
 * these "owned-but-managed": Better Auth's D1/Drizzle adapter reads and writes them;
 * we only declare their shape so migrations and FKs exist.
 *
 * Conventions that matter for the adapter:
 * - The Drizzle **property names** (the JS keys) must equal Better Auth's field
 *   names (`expiresAt`, `userId`, `accountId`, …) — the adapter looks columns up by
 *   property, not by SQL name. SQL column names stay snake_case per `conventions.md`.
 * - Date fields use `integer({ mode: 'timestamp_ms' })`: Better Auth runs with
 *   `supportsDates: true`, so it hands `Date` objects to Drizzle and the column mode
 *   does the conversion — storing epoch **milliseconds** (decision D10).
 * - `users` itself lives in `schema.ts` (it is ours, extended); these reference it.
 */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './schema.js';

/** A timestamp column storing epoch ms, round-tripping a JS `Date` for Better Auth. */
const tsMs = (name: string) => integer(name, { mode: 'timestamp_ms' });

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: tsMs('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: tsMs('created_at').notNull(),
    updatedAt: tsMs('updated_at').notNull(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
);

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: tsMs('access_token_expires_at'),
    refreshTokenExpiresAt: tsMs('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: tsMs('created_at').notNull(),
    updatedAt: tsMs('updated_at').notNull(),
  },
  (t) => [index('accounts_user_id_idx').on(t.userId)],
);

export const verifications = sqliteTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: tsMs('expires_at').notNull(),
    createdAt: tsMs('created_at').notNull(),
    updatedAt: tsMs('updated_at').notNull(),
  },
  (t) => [index('verifications_identifier_idx').on(t.identifier)],
);
