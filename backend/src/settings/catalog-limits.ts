/**
 * Site-wide limit for the catalog files of materials (Settings > Files, manager and above).
 * It is checked only when a file is uploaded: files that are already in a catalog are never touched, resized or removed
 * when the limit changes - only the files added from then on follow the new size.
 */
export const CATALOG_SETTING_KEY = 'catalog';
/** Used until a manager saves a value (and when the saved value is missing or damaged). */
export const CATALOG_DEFAULT_MB = 10;
export const CATALOG_MIN_MB = 1;
/** Hard ceiling: each file is turned into a page of the print / PDF, so a huge file only makes quotations slow. */
export const CATALOG_MAX_MB = 50;
export const CATALOG_FILES_MAX = 10;

export type CatalogSettings = {
  /** The size managers type and everybody sees. */
  maxFileSizeMb: number;
  /** The same size in bytes: what the upload and the browser check against. */
  maxFileSizeBytes: number;
};

/** Saved value -> a complete, valid setting (anything missing, not a whole number or outside 1-50 falls back to the default). */
export function normalizeCatalog(raw: unknown): CatalogSettings {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const n = Number(src.maxFileSizeMb);
  const mb = Number.isInteger(n) && n >= CATALOG_MIN_MB && n <= CATALOG_MAX_MB ? n : CATALOG_DEFAULT_MB;
  return { maxFileSizeMb: mb, maxFileSizeBytes: mb * 1024 * 1024 };
}
