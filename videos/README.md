# Video Files Directory

This directory contains instruction videos that can be embedded in surveys or slider interfaces.

## Adding Video Files

1. Place your MP4 video files in this directory
2. Update `sw.js` to include the video files in the cache (uncomment and modify the example lines)
3. Embed the video using HTML5 `<video>` tag

## Recommended Video Format

- **Format**: MP4 (H.264 codec)
- **Resolution**: 720p (1280×720) recommended for instructions
- **File size**: Keep under 10MB for reasonable offline storage
- **Audio**: Include if needed, or remove audio track to reduce file size

## Embedding Videos

### In Survey JSON (surveyChild.json, surveySandwich.json, etc.)

Add HTML in question text:

```json
{
  "type": "info",
  "text": "<video controls width='100%' style='max-width: 640px;'><source src='videos/instructions.mp4' type='video/mp4'></video><p>Please watch the video above before continuing.</p>"
}
```

### In Slider Instructions (scenarios.json, scenarios-dummy.json)

Add to `infotext` field (supports HTML):

```json
{
  "infotext": "<video controls width='100%' style='max-width: 640px;'><source src='videos/practice-instructions.mp4' type='video/mp4'></video><br><br>Por favor distribuya las fichas..."
}
```

### In slider.html

Add directly in the HTML:

```html
<div class="video-section mb-3">
  <video controls width="100%" style="max-width: 640px;">
    <source src="videos/instructions.mp4" type="video/mp4">
    Your browser doesn't support video playback.
  </video>
</div>
```

## Browser Support

The HTML5 `<video>` element with MP4 format is supported by:
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Works offline when cached by service worker

## Service Worker Configuration

When you add video files, update `sw.js` to include them:

```javascript
const urlsToCache = [
  // ... other files
  './videos/instructions.mp4',
  './videos/practice-instructions.mp4',
  // ... more videos
];
```

Remember to increment the cache version number in `sw.js` after adding videos:
```javascript
const CACHE_NAME = 'resource-allocation-v54'; // or next version
```
