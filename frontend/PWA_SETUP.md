# PWA Setup Instructions

## Current Status
✅ Service Worker registered
✅ Web App Manifest configured
✅ PWA meta tags added
⚠️ App icons need to be created

## To Complete PWA Setup:

### 1. Create App Icons
You need to create the following icon files and place them in the `public/` directory:

- `icon-192x192.png` - 192x192 pixels
- `icon-512x512.png` - 512x512 pixels

**Recommended Icon Design:**
- Use your company logo or an HR-themed icon
- Ensure good contrast for visibility
- Test on both light and dark backgrounds
- Make sure the icon is recognizable at small sizes

### 2. Update Manifest (after creating icons)
Once you have the proper icon files, update `public/manifest.json`:

```json
"icons": [
  {
    "src": "/icon-192x192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "maskable any"
  },
  {
    "src": "/icon-512x512.png", 
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "maskable any"
  }
]
```

### 3. Update index.html (after creating icons)
Update the apple-touch-icon link:
```html
<link rel="apple-touch-icon" href="/icon-192x192.png" />
```

## Testing PWA
1. Open Chrome DevTools > Application > Manifest
2. Check for any manifest errors
3. Test "Add to Home Screen" functionality
4. Verify the app opens in standalone mode (no browser UI)

## Features Enabled
- **Standalone Display**: App opens without browser UI when installed
- **Offline Caching**: Basic caching for faster loading
- **Install Prompt**: Users can install the app to their device
- **Theme Color**: Matches app branding
- **Responsive**: Works on mobile and desktop 