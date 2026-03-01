import { type ChangeEvent } from 'react';

function VideoUpload({ onVideoLoaded }: { onVideoLoaded: (file: File) => void }) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log({file});
    if (file && file.type.startsWith('video/')) {
      // Basic validation
      if (file.size > 500 * 1024 * 1024) { // 500MB
        alert('File too large. Maximum size is 500MB');
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