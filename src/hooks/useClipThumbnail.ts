import { useCallback } from 'react';
import { THUMB_WIDTH, THUMB_HEIGHT, THUMB_JPEG_QUALITY, seekToTime } from '../utils/thumbnails';

/**
 * Returns an async function that seeks a video element to the given time
 * and captures a JPEG frame via the Canvas API.
 *
 * Usage:
 *   const captureFrame = useClipThumbnail();
 *   const dataUrl = await captureFrame(videoRef.current, inPoint);
 */
export function useClipThumbnail() {
  const captureFrame = useCallback(
    async (video: HTMLVideoElement, time: number): Promise<string | undefined> => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = THUMB_WIDTH;
        canvas.height = THUMB_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;

        await seekToTime(video, time);

        ctx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
        return canvas.toDataURL('image/jpeg', THUMB_JPEG_QUALITY);
      } catch {
        return undefined;
      }
    },
    [],
  );

  return captureFrame;
}
