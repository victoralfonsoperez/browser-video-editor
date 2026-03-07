import { type ChangeEvent } from 'react';
import { MAX_FILE_SIZE_BYTES } from '../../constants/ui';

function VideoUpload({ onVideoLoaded }: { onVideoLoaded: (file: File) => void }) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file && file.type.startsWith('video/')) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert('File too large (max 500MB)');
        return;
      }
      
      onVideoLoaded(file);
    }
  };

  return (
    <input 
      type="file" 
      accept="video/*"
      onChange={handleFileChange}
    />
  );
}

export default VideoUpload;