// Mirrors backend/src/config/custodyHolders.ts. Kept as a small static map
// rather than another fetch: the asset table and the history timeline need a
// label per row, and blocking those renders on a network round-trip to
// translate three constants would be silly. The API is still the authority on
// which holders are *enabled* — this only turns a code into Thai.
export const CUSTODY_HOLDER_LABELS: Record<string, string> = {
  HR_TRR: 'ฝ่ายบุคคล TRR',
  HR_PS: 'ฝ่ายบุคคล PS',
  IT_STORE: 'ห้องเก็บของ IT',
};

export const custodyHolderLabel = (code: string | null | undefined): string =>
  (code && CUSTODY_HOLDER_LABELS[code]) || code || '';
