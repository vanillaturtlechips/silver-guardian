
# Silver Guardian — AI Vision Monitoring Dashboard

## Overview
A real-time AI monitoring platform with a clean, professional white/blue theme for monitoring YouTube content using AI analysis. The dashboard simulates detection events with mock data, structured for easy future integration with a Go-based backend.

## Pages & Layout

### Main Dashboard (Single Page)
A full-screen dashboard with three zones:

1. **Top Status Bar**
   - "Silver Guardian" branding on the left
   - "Engine Status: Active" indicator with a green pulse dot
   - "Safety Score" meter (animated progress bar, e.g. 92%)
   - Light blue/white professional styling

2. **Center — YouTube Video Player**
   - URL input field at the top with a "Monitor" button
   - Large embedded YouTube iframe that updates when a URL is submitted
   - Clean card container with subtle shadow

3. **Right Sidebar — AI Analysis Log**
   - Terminal-style scrolling log panel (dark background for contrast)
   - Auto-scrolling entries with timestamps: "Extracting captions…", "Analyzing content with Gemini…", "Status: Safe ✓"
   - Color-coded entries (green for safe, yellow for warning, red for alert)
   - Simulated detection flow triggered when a video URL is submitted
   - "Scanning…" animation on submission

### Settings Panel
   - Accessible via a gear icon in the top bar (opens as a slide-over sheet)
   - **API Configuration**: Gemini API key input field, Go backend URL endpoint field
   - **Detection Sensitivity**: Slider control (Low / Medium / High)
   - **Scan Interval**: Configurable interval setting
   - All settings stored in local state (ready for backend integration)

## Simulated Detection Flow
When a user submits a YouTube URL:
1. Player loads the video
2. Log sidebar shows "Scanning…" animation
3. After a short delay, mock log entries appear sequentially:
   - "Connecting to stream…"
   - "Captions extracted successfully"
   - "Analyzing content with Gemini AI…"
   - "Content analysis complete — Status: Safe"
4. Safety Score updates accordingly

## Design
- **Theme**: Light professional — white backgrounds, blue accents, clean typography
- **Components**: shadcn/ui cards, buttons, inputs, sheets, progress bars, sliders
- **Icons**: Lucide icons (Shield, Activity, Eye, Settings, etc.)
- **Log panel**: Monospace font, dark background for terminal contrast

## Architecture Notes
- Frontend structured with a dedicated API service file for future `fetch` calls to the Go sidecar
- Settings stored in React context for easy access across components
- Clean separation of UI components for maintainability
