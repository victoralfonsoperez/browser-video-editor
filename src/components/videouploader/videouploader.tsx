import { type ChangeEvent } from 'react';

function VideoUpload({ onVideoLoaded }: { onVideoLoaded: (file: File) => void }) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file && file.type.startsWith('video/')) {
      // Basic validation
      if (file.size > 1500 * 1024 * 1024) { // 1.5GB
        alert('File too large. Maximum size is 1.5GB');
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