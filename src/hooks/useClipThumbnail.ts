import { useCallback } from 'react';

const THUMB_W = 80;
const THUMB_H = 45;

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
        canvas.width = THUMB_W;
        canvas.height = THUMB_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('seek timeout')), 5000);
          const onSeeked = () => {
            clearTimeout(timeout);
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
          video.currentTime = time;
        });

        ctx.drawImage(video, 0, 0, THUMB_W, THUMB_H);
        return canvas.toDataURL('image/jpeg', 0.6);
      } catch {
        return undefined;
      }
    },
    [],
  );

  return captureFrame;
}
