export const DIGEST_MIN_ITEMS = 5;
export const DIGEST_MAX_ITEMS = 10;

export function canExportDigest(count: number) {
  return Number.isInteger(count) && count >= DIGEST_MIN_ITEMS && count <= DIGEST_MAX_ITEMS;
}

export function toggleDigestItem(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((value) => value !== id)
    : ids.length < DIGEST_MAX_ITEMS ? [...ids, id] : ids;
}