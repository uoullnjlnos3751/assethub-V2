/**
 * Custody holders — the physical drop-off points that can hold a device
 * without it being "assigned" to anyone.
 *
 * Why this is a plain list and not a Prisma enum: the immediate need is only
 * HR-TRR (staff hand their laptop to TRR's HR when they resign), but the same
 * shape covers HR-PS and the IT store room later. Keeping it here means
 * opening a new drop-off point is a one-line edit plus a role grant, with no
 * migration and no downtime.
 *
 * `enabled: false` entries are deliberately still listed — they document the
 * intended codes so nobody invents a different spelling later — but
 * isValidHolder() rejects them, so an API call naming one gets a 400.
 */

export interface CustodyHolder {
  code: string;
  label: string;
  /** Company the drop-off point belongs to — display only; it does NOT limit
   *  which company's assets can be checked in (PS laptops are returned to
   *  HR-TRR too). */
  company: string;
  enabled: boolean;
}

export const CUSTODY_HOLDERS: CustodyHolder[] = [
  { code: 'HR_TRR', label: 'ฝ่ายบุคคล TRR', company: 'TRR', enabled: true },
  { code: 'HR_PS', label: 'ฝ่ายบุคคล PS', company: 'PS', enabled: false },
  { code: 'IT_STORE', label: 'ห้องเก็บของ IT (TRRT)', company: 'TRR', enabled: true },
];

export const enabledHolders = (): CustodyHolder[] => CUSTODY_HOLDERS.filter(h => h.enabled);

export const isValidHolder = (code: unknown): code is string =>
  typeof code === 'string' && CUSTODY_HOLDERS.some(h => h.code === code && h.enabled);

export const holderLabel = (code: string | null | undefined): string =>
  CUSTODY_HOLDERS.find(h => h.code === code)?.label || code || '';

/**
 * Which holder a user with a custody role acts on behalf of.
 *
 * One role → one holder. When HR-PS is opened, it gets its own role rather
 * than a shared "HR" role, so a PS clerk can never move a device into TRR's
 * pile by passing a different `holder` in the request body.
 */
export const ROLE_TO_HOLDER: Record<string, string> = {
  HR_CUSTODY: 'HR_TRR',
};

/** Roles that may only ever touch their own holder's pile. */
export const isCustodyRole = (role: string | undefined): boolean =>
  !!role && role in ROLE_TO_HOLDER;
