/**
 * Supported Google Drive URL formats:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID&export=download
 */
export function extractGoogleDriveFileId(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (!parsed.hostname.includes('drive.google.com')) {
      return null;
    }

    // Format: /file/d/FILE_ID/...
    const filePathMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (filePathMatch) {
      return filePathMatch[1];
    }

    // Format: ?id=FILE_ID (open and uc endpoints)
    const idParam = parsed.searchParams.get('id');
    if (idParam && /^[a-zA-Z0-9_-]+$/.test(idParam)) {
      return idParam;
    }

    return null;
  } catch {
    // URL constructor throws on invalid URLs
    return null;
  }
}

export function buildGoogleDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
