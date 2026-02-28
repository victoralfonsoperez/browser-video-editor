import { describe, it, expect } from 'vitest';
import { extractGoogleDriveFileId, buildProxiedGoogleDriveUrl } from './googleDrive';

describe('extractGoogleDriveFileId', () => {
  it('extracts file ID from /file/d/ID/view', () => {
    expect(extractGoogleDriveFileId('https://drive.google.com/file/d/1aBcD_EfGhIjKlMnOpQrStUvWxYz/view')).toBe('1aBcD_EfGhIjKlMnOpQrStUvWxYz');
  });

  it('extracts file ID from /file/d/ID/view?usp=sharing', () => {
    expect(extractGoogleDriveFileId('https://drive.google.com/file/d/1aBcD_EfGhIjKlMnOpQrStUvWxYz/view?usp=sharing')).toBe('1aBcD_EfGhIjKlMnOpQrStUvWxYz');
  });

  it('extracts file ID from open?id=ID format', () => {
    expect(extractGoogleDriveFileId('https://drive.google.com/open?id=1aBcD_EfGhIjKlMnOpQrStUvWxYz')).toBe('1aBcD_EfGhIjKlMnOpQrStUvWxYz');
  });

  it('extracts file ID from uc?id=ID format', () => {
    expect(extractGoogleDriveFileId('https://drive.google.com/uc?id=1aBcD_EfGhIjKlMnOpQrStUvWxYz&export=download')).toBe('1aBcD_EfGhIjKlMnOpQrStUvWxYz');
  });

  it('returns null for a non-Drive URL', () => {
    expect(extractGoogleDriveFileId('https://www.example.com/file/d/someId/view')).toBeNull();
  });

  it('returns null for a malformed string', () => {
    expect(extractGoogleDriveFileId('not a url at all')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractGoogleDriveFileId('')).toBeNull();
  });

  it('returns null for a Drive URL with no recognisable ID', () => {
    expect(extractGoogleDriveFileId('https://drive.google.com/drive/folders/')).toBeNull();
  });
});

describe('buildProxiedGoogleDriveUrl', () => {
  it('builds the expected proxied URL', () => {
    expect(buildProxiedGoogleDriveUrl('FILEID123')).toBe('/api/gdrive/uc?export=download&id=FILEID123&confirm=t');
  });
});
