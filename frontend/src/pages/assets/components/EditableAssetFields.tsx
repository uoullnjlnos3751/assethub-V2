import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Popper, Paper, Fade, ClickAwayListener, TextField, Autocomplete,
  CircularProgress, Button, alpha, useTheme,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { getStatusMeta } from '../../../config/statusConfig';
import StatusChip from '../../../components/StatusChip';
import { assetAPI } from '../../../services/api';

/**
 * Inline-editable versions of the Asset Detail header/Fact chips — click the
 * value, pick or type a new one, it saves without leaving the page. Adapted
 * from InvGate's Asset Explorer detail header (see docs/system-blueprint's
 * UX proposal). Both components below are no-ops when `canEdit` is false —
 * IT_ADMIN/SUPERADMIN only, matching the backend's PUT /assets/:id gate.
 */

const POPOVER_WIDTH = 260;

/* ── Status: closed set, so it's a pick-list rather than a text editor ──── */

interface StatusOption { code: string; label: string }

interface EditableStatusChipProps {
  status: string;
  canEdit: boolean;
  onChange: (next: string) => Promise<void>;
}

export function EditableStatusChip({ status, canEdit, onChange }: EditableStatusChipProps) {
  const theme = useTheme();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<StatusOption[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || options !== null) return;
    assetAPI.statusOptions()
      .then(res => {
        const rows = (res.data || []).map((item: { code: string; name: string }) => ({
          code: item.code,
          label: getStatusMeta(item.code, theme).label || item.name || item.code,
        }));
        setOptions(rows);
      })
      .catch(() => setOptions([]));
  }, [open, options, theme]);

  if (!canEdit) return <StatusChip status={status} />;

  const close = () => { if (!saving) setOpen(false); };

  const pick = async (code: string) => {
    if (code === status) { setOpen(false); return; }
    setSaving(code);
    setError(null);
    try {
      await onChange(code);
      setOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <Box
        ref={anchorRef}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); } }}
        className="editable-chip-trigger"
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
          borderRadius: 999, outline: 'none',
          '&:focus-visible': { boxShadow: `0 0 0 2px ${theme.palette.primary.main}` },
        }}
      >
        <StatusChip status={status} />
        <EditRoundedIcon
          className="edit-affordance"
          sx={{ fontSize: 13, color: theme.palette.text.disabled, opacity: 0, transition: 'opacity .12s' }}
        />
      </Box>
      <style>{`.editable-chip-trigger:hover .edit-affordance { opacity: 1; }`}</style>

      <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start" transition sx={{ zIndex: 1300 }}>
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={120}>
            <Paper elevation={6} sx={{ mt: '6px', width: 224, borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
              <ClickAwayListener onClickAway={close}>
                <Box sx={{ p: '6px' }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: theme.palette.text.disabled, textTransform: 'uppercase', letterSpacing: '.06em', px: '8px', pt: '4px', pb: '6px' }}>
                    เปลี่ยนสถานะ
                  </Typography>
                  {options === null ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={18} />
                    </Box>
                  ) : options.length === 0 ? (
                    <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary, px: 1, py: 1 }}>
                      โหลดรายการสถานะไม่สำเร็จ
                    </Typography>
                  ) : options.map(opt => {
                    const meta = getStatusMeta(opt.code, theme);
                    const isCurrent = opt.code === status;
                    const isSaving = saving === opt.code;
                    return (
                      <Box
                        key={opt.code}
                        onClick={() => !saving && pick(opt.code)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          px: '9px', py: '7px', borderRadius: '8px', cursor: saving ? 'default' : 'pointer',
                          bgcolor: isCurrent ? alpha(meta.color, 0.1) : 'transparent',
                          opacity: saving && !isSaving ? 0.5 : 1,
                          '&:hover': { bgcolor: saving ? undefined : alpha(theme.palette.text.primary, 0.05) },
                        }}
                      >
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: meta.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: isCurrent ? 700 : 500, flex: 1, color: theme.palette.text.primary }}>
                          {opt.label}
                        </Typography>
                        {isSaving
                          ? <CircularProgress size={13} />
                          : isCurrent && <CheckRoundedIcon sx={{ fontSize: 15, color: meta.color }} />}
                      </Box>
                    );
                  })}
                  {error && (
                    <Typography sx={{ fontSize: '0.72rem', color: theme.palette.error.main, px: '9px', pt: '4px', pb: '2px' }}>
                      {error}
                    </Typography>
                  )}
                </Box>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
}

/* ── Fact fields: owner / department / location ──────────────────────────
   Same visual as the plain read-only Fact cell (label over value) so
   swapping one in doesn't reflow the at-a-glance grid; only the value gets
   the click-to-edit affordance. */

interface SearchResult { label: string; value: string; sub?: string }

interface EditableFactProps {
  label: string;
  value?: string | null;
  /** Read-only sub-line under the value (e.g. floor number) — not itself editable here. */
  sub?: string | null;
  canEdit: boolean;
  onChange: (next: string) => Promise<void>;
  /** Closed set the value must come from (current value is auto-included even if stale/unlisted). */
  options?: string[];
  /** Async suggestions as the user types — used instead of `options` for owner search. Implies free text is allowed. */
  searchFn?: (query: string) => Promise<SearchResult[]>;
  /** Backend rejects an empty value for this field — no clear affordance, and Save is disabled on empty. */
  required?: boolean;
  placeholderEmpty?: string;
}

export function EditableFact({
  label, value, sub, canEdit, onChange, options, searchFn, required, placeholderEmpty = 'ไม่ระบุ',
}: EditableFactProps) {
  const theme = useTheme();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const display = value?.trim() ? value : null;
  const freeSolo = !!searchFn;

  const startEdit = () => {
    setDraft(value || '');
    setError(null);
    setOpen(true);
  };

  const close = () => { if (!saving) setOpen(false); };

  // Debounced async search — mirrors the owner-search pattern in AssetFormPage.
  useEffect(() => {
    if (!searchFn || !open) return;
    const q = draft.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      searchFn(q).then(setSearchResults).catch(() => setSearchResults([])).finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [draft, searchFn, open]);

  const commit = async (next: string) => {
    const trimmed = next.trim();
    if (required && !trimmed) { setError(`${label} ต้องไม่ว่างเปล่า`); return; }
    if (trimmed === (value || '').trim()) { setOpen(false); return; }
    setSaving(true);
    setError(null);
    try {
      await onChange(trimmed);
      setOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.69rem', color: theme.palette.text.secondary, lineHeight: 1.4 }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.86rem', fontWeight: 700, mt: '2px', color: theme.palette.text.primary, wordBreak: 'break-word' }}>
          {display ?? '—'}
        </Typography>
        {sub && <Typography noWrap sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled }}>{sub}</Typography>}
      </Box>
    );
  }

  const listOptions: (string | SearchResult)[] = searchFn ? searchResults : (options || []);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: '0.69rem', color: theme.palette.text.secondary, lineHeight: 1.4 }}>{label}</Typography>
      <Box
        ref={anchorRef}
        role="button"
        tabIndex={0}
        onClick={startEdit}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(); } }}
        className="editable-fact-trigger"
        sx={{
          display: 'flex', alignItems: 'center', gap: '4px', mt: '2px', cursor: 'pointer',
          borderRadius: '6px', outline: 'none', mx: '-4px', px: '4px', py: '1px',
          '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.045) },
          '&:focus-visible': { boxShadow: `0 0 0 2px ${theme.palette.primary.main}` },
        }}
      >
        <Typography sx={{
          fontSize: '0.86rem', fontWeight: 700, color: display ? theme.palette.text.primary : theme.palette.text.disabled,
          wordBreak: 'break-word', fontStyle: display ? 'normal' : 'italic',
        }}>
          {display ?? placeholderEmpty}
        </Typography>
        <EditRoundedIcon className="edit-affordance" sx={{ fontSize: 12, color: theme.palette.text.disabled, opacity: 0, transition: 'opacity .12s', flexShrink: 0 }} />
      </Box>
      {sub && <Typography noWrap sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled }}>{sub}</Typography>}
      <style>{`.editable-fact-trigger:hover .edit-affordance { opacity: 1; }`}</style>

      <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start" transition sx={{ zIndex: 1300 }}>
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={120}>
            <Paper elevation={6} sx={{ mt: '6px', width: POPOVER_WIDTH, borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, p: '10px' }}>
              <ClickAwayListener onClickAway={close}>
                <Box>
                  <Autocomplete
                    freeSolo={freeSolo}
                    autoHighlight
                    options={listOptions}
                    loading={searchFn ? searching : false}
                    getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.label}
                    filterOptions={searchFn ? (x) => x : undefined}
                    // Controlling both `value` and `inputValue` to the same
                    // draft string keeps MUI's own mount-time input reset (it
                    // syncs inputValue to getOptionLabel(value) as soon as it
                    // sees a `value`) a no-op instead of it clobbering the
                    // asset's current value with '' right after the popover opens.
                    value={draft}
                    inputValue={draft}
                    onInputChange={(_, v) => setDraft(v)}
                    onChange={(_, newValue) => {
                      const v = typeof newValue === 'string' ? newValue : (newValue?.value ?? '');
                      commit(v);
                    }}
                    disabled={saving}
                    renderOption={(props, opt) => {
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { key, ...rest } = props as Record<string, any>;
                      if (typeof opt === 'string') return <li key={opt} {...rest}>{opt}</li>;
                      return (
                        <li key={opt.value} {...rest}>
                          <Box>
                            <Typography variant="body2">{opt.label}</Typography>
                            {opt.sub && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{opt.sub}</Typography>}
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        autoFocus
                        size="small"
                        placeholder={searchFn ? 'พิมพ์ค้นหา...' : placeholderEmpty}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commit(draft); }
                          if (e.key === 'Escape') close();
                        }}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {searching ? <CircularProgress size={14} sx={{ mr: 0.5 }} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />

                  {error && (
                    <Typography sx={{ fontSize: '0.72rem', color: theme.palette.error.main, mt: '6px' }}>
                      {error}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: '8px' }}>
                    {!required && display ? (
                      <Button size="small" onClick={() => commit('')} disabled={saving} sx={{ fontSize: '0.7rem', textTransform: 'none', color: theme.palette.text.secondary, minWidth: 0, px: '4px' }}>
                        ล้างค่า
                      </Button>
                    ) : <Box />}
                    <Box sx={{ display: 'flex', gap: '6px' }}>
                      <Button size="small" onClick={close} disabled={saving} sx={{ fontSize: '0.72rem', textTransform: 'none', minWidth: 0, px: '10px' }}>
                        ยกเลิก
                      </Button>
                      <Button
                        size="small" variant="contained" onClick={() => commit(draft)}
                        disabled={saving || (required && !draft.trim())}
                        sx={{ fontSize: '0.72rem', textTransform: 'none', minWidth: 0, px: '10px', boxShadow: 'none' }}
                      >
                        {saving ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : 'บันทึก'}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  );
}
