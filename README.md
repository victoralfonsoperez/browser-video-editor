# Browser Video Editor

A browser-based video clip editor for creating and exporting clips from video files. Built with React and powered by client-side video processing.

## 🎯 Project Overview

This tool allows users to:
- Upload video files locally
- Visualize videos with an interactive timeline
- Create multiple clips from a single video
- Preview clips in real-time
- Export clips as downloadable video files

All processing happens directly in the browser - no server required!

## ✨ Features (Planned)

### MVP Features
- ✅ Local file upload with drag & drop
- ✅ Multi-format video playback (MP4, WebM, MOV)
- ✅ Interactive timeline with thumbnail previews
- ✅ Trim tools (set in/out points)
- ✅ Multiple clips from single video
- ✅ In-browser clip preview
- ✅ Export clips as video files

### Future Enhancements
- Audio waveform visualization
- Transitions between clips
- Text overlays and titles
- Video filters and effects
- Multi-track editing
- Cloud storage integration
- Collaborative editing features

## 🛠️ Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Video Processing**: FFmpeg.wasm
- **UI Components**: Radix UI / shadcn/ui
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Canvas API**: For thumbnail generation
- **Web Workers**: For performance optimization

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation
```bash
# Clone the repository
git clone https://github.com/victoralfonsoperez/browser-video-editor.git

# Navigate to project directory
cd browser-video-editor

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production
```bash
npm run build
```

## 📚 Documentation

Detailed documentation will be added as the project progresses:
- User Guide
- API Reference
- Contributing Guidelines
- Architecture Overview

## 🤝 Contributing

Contributions are welcome! This is an open-source side project. Please feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📝 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🎓 Learning Resources

Key resources for building this project:
- [HTML5 Video API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [FFmpeg.wasm Documentation](https://ffmpegwasm.netlify.app/)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

## 📊 Project Status

**Current Phase**: Planning & Setup  
**Progress**: 0% Complete  
**Started**: February 2026  
**Target Completion**: April-May 2026

---

**Note**: This project is under active development. Features and timelines may change as development progresses.

## 💡 Technical Considerations

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance Targets
- Support videos up to 2GB
- Thumbnail generation < 5s for 10min video
- Export speed: ~1x video duration
- Responsive UI (60fps timeline scrubbing)

### File Format Support
- **Primary**: MP4 (H.264/AAC)
- **Secondary**: WebM (VP8/VP9), MOV
- **Codec dependent**: AVI, MKV

---

Built with ❤️ by [Victor Pérez](https://github.com/victoralfonsoperez)
