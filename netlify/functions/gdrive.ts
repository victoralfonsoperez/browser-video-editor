import type { Context } from "@netlify/functions";

/** Maps a filename extension to a video MIME type. */
function videoMimeFromDisposition(disposition: string): string | null {
  const m = disposition.match(/filename[^;=\n]*=\s*["']?([^"';\n]+)["']?/);
  if (!m) return null;
  const ext = m[1].trim().split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    mp4: 'video/mp4', m4v: 'video/mp4', m4p: 'video/mp4',
    mov: 'video/quicktime', qt: 'video/quicktime',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    ogv: 'video/ogg', ogg: 'video/ogg',
  };
  return map[ext ?? ''] ?? null;
}

/**
 * Google Drive returns an HTML confirmation page for large files.
 * Extract the real download URL from it.
 */
function extractConfirmedDownloadUrl(html: string): string | null {
  const ucontentHref = html.match(
    /href="(https:\/\/drive\.usercontent\.google\.com\/download\?[^"]+)"/,
  );
  if (ucontentHref) {
    return ucontentHref[1].replace(/&amp;/g, '&');
  }

  const formActionMatch = html.match(
    /action="(https:\/\/drive\.usercontent\.google\.com\/download[^"]*)"/,
  );
  if (formActionMatch) {
    const uuidMatch =
      html.match(/name="uuid"[^>]*value="([^"]+)"/) ??
      html.match(/value="([^"]+)"[^>]*name="uuid"/);
    const idMatch =
      html.match(/name="id"[^>]*value="([^"]+)"/) ??
      html.match(/value="([^"]+)"[^>]*name="id"/);
    if (uuidMatch && idMatch) {
      const base = formActionMatch[1].replace(/&amp;/g, '&');
      const u = new URL(base.includes('?') ? base : `${base}?_=1`);
      u.searchParams.set('id', idMatch[1]);
      u.searchParams.set('export', 'download');
      u.searchParams.set('confirm', 't');
      u.searchParams.set('uuid', uuidMatch[1]);
      u.searchParams.delete('_');
      return u.toString();
    }
  }

  const ucHref = html.match(/href="(\/uc\?[^"]*export=download[^"]+)"/);
  if (ucHref) {
    return 'https://drive.google.com' + ucHref[1].replace(/&amp;/g, '&');
  }

  return null;
}

async function followRedirects(
  url: string,
  rangeHeader: string | null,
  remaining: number,
): Promise<Response> {
  if (remaining <= 0) {
    return new Response('Too many redirects', { status: 508 });
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'user-agent': 'Mozilla/5.0',
      ...(rangeHeader ? { range: rangeHeader } : {}),
    },
    redirect: 'manual',
  });

  // Follow redirects manually
  if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.get('location')) {
    const next = res.headers.get('location')!;
    const resolved = next.startsWith('http') ? next : new URL(next, url).href;
    return followRedirects(resolved, rangeHeader, remaining - 1);
  }

  // HTML confirmation page for large files
  if ((res.headers.get('content-type') ?? '').includes('text/html')) {
    const html = await res.text();
    const downloadUrl = extractConfirmedDownloadUrl(html);
    if (downloadUrl && remaining > 1) {
      return followRedirects(downloadUrl, rangeHeader, remaining - 1);
    }
    return new Response(
      'Google Drive requires confirmation; no download URL found in page',
      { status: 502 },
    );
  }

  // Success — stream the video back
  const rawContentType = res.headers.get('content-type') ?? '';
  const disposition = res.headers.get('content-disposition') ?? '';
  const resolvedContentType = rawContentType.startsWith('video/')
    ? rawContentType
    : (videoMimeFromDisposition(disposition) ?? 'video/mp4');

  const responseHeaders: Record<string, string> = {
    'content-type': resolvedContentType,
    'accept-ranges': res.headers.get('accept-ranges') ?? 'bytes',
    'cross-origin-resource-policy': 'cross-origin',
  };
  const contentLength = res.headers.get('content-length');
  if (contentLength) responseHeaders['content-length'] = contentLength;
  const contentRange = res.headers.get('content-range');
  if (contentRange) responseHeaders['content-range'] = contentRange;

  return new Response(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  // Strip the /api/gdrive prefix to get the Google Drive path
  const gdrivePath = url.pathname.replace(/^\/api\/gdrive/, '') || '/';
  const targetUrl = `https://drive.google.com${gdrivePath}${url.search}`;
  const rangeHeader = req.headers.get('range');

  try {
    return await followRedirects(targetUrl, rangeHeader, 10);
  } catch (err) {
    return new Response(`Proxy error: ${(err as Error).message}`, { status: 502 });
  }
};
