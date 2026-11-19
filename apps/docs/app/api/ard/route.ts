import { ardManifest } from '@/lib/ard';

export const dynamic = 'force-static';

/** Served at /.well-known/ard.json, and at the predecessor path /.well-known/ai-catalog.json for older readers. */
export function GET() {
  return Response.json(ardManifest(), { headers: { 'cache-control': 'public, max-age=3600' } });
}
