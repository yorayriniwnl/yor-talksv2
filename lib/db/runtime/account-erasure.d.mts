import type { SQL } from 'drizzle-orm';

export type ErasureExecutor = (statement: SQL) => Promise<unknown>;
export function accountErasureExecutor(client: { query(text: string, values: unknown[]): Promise<unknown> }): ErasureExecutor;
export function eraseAccountData(execute: ErasureExecutor,
  user: { id: string; email: string; emailVerified: boolean | null },
  journal?: { id?: string; erasedAt?: string; emailHash?: string; replay?: boolean }): Promise<void>;
