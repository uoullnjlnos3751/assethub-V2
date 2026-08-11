// localStorage-backed "saved filter views" for the asset registry list page.
// No backend model needed — this is a personal, per-browser convenience feature.

export interface AssetListFilterState {
  search: string;
  statuses: string[];
  type: string;
  company: string;
  warrantyStatus: string;
  purchaseDateFrom: string;
  purchaseDateTo: string;
}

export interface SavedFilterView {
  id: string;
  name: string;
  filters: AssetListFilterState;
  createdAt: string;
}

const STORAGE_KEY = 'assethub.assetList.savedViews.v1';

export function loadSavedViews(): SavedFilterView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFilterView(name: string, filters: AssetListFilterState): SavedFilterView[] {
  const views = loadSavedViews();
  const next: SavedFilterView = { id: `${Date.now()}`, name, filters, createdAt: new Date().toISOString() };
  const updated = [...views, next];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteFilterView(id: string): SavedFilterView[] {
  const updated = loadSavedViews().filter((v) => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
