/** Largest positive amount supported by the current PostgreSQL integer columns. */
export const MAX_LEDGER_AMOUNT_MINOR = 2_147_483_647;

export const MAX_MARKETPLACE_PRICE = MAX_LEDGER_AMOUNT_MINOR / 100;

export function toMinorUnits(amount: number): number | undefined {
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const minor = Math.round(amount * 100);
  if (!Number.isSafeInteger(minor) || minor > MAX_LEDGER_AMOUNT_MINOR) return undefined;
  return minor;
}
