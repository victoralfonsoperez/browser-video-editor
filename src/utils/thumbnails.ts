export const THUMB_WIDTH = 80;
export const THUMB_HEIGHT = 45;
export const THUMB_JPEG_QUALITY = 0.6;

/**
 * Seek a video element to `time` and resolve when the `seeked` event fires.
 * Rejects after `timeoutMs` (default 5 000 ms) if the seek never completes.
 */
export function seekToTime(
  video: HTMLVideoElement,
  time: number,
  timeoutMs = 5000,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      reject(new Error('seek timeout'));
    }, timeoutMs);

    const onSeeked = () => {
      clearTimeout(timeout);
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };

    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}
