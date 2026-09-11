// Uploaded files used to be linked as /uploads/<file>, relying on Next's
// built-in static handling of the public/ directory. On Railway that broke:
// the production server only has the public/ snapshot taken at build time,
// so a file written to the volume by a later upload was never served.
//
// New uploads are now linked as /api/uploads/<file>, a route that reads the
// file off disk on every request (see app/api/uploads/[filename]/route.ts).
// Existing database rows may still hold the old /uploads/ path - rewrite
// those on the fly so old records keep working without a migration.
export function resolveUploadUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('/uploads/')) return `/api/uploads/${url.slice('/uploads/'.length)}`
  return url
}
