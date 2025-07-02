# 🎤 Microphone Access Troubleshooting Guide

This guide helps resolve common microphone access issues with the Real-Time Audio Visualizer.

## Quick Fixes

### ✅ Most Common Solution
1. **Look for the microphone icon** 🎤 in your browser's address bar
2. **Click it** and select "Allow" or "Always allow"
3. **Refresh the page** and try again

### 🔒 Security Requirements
- The app **must run on HTTPS** or **localhost** (security requirement)
- Use `https://` instead of `http://` if hosting online
- Local development on `localhost` or `127.0.0.1` works fine

## Browser-Specific Help

### 🟢 Chrome/Chromium
1. Click the **microphone icon** in the address bar (right side)
2. Select "Always allow on this site"
3. Refresh the page

### 🟠 Firefox
1. Click the **shield icon** in the address bar
2. Turn off "Enhanced Tracking Protection" for this site
3. Allow microphone access when prompted
4. Refresh the page

### 🔵 Safari
1. Go to **Safari > Preferences > Websites > Microphone**
2. Set this website to "Allow"
3. Refresh the page

### 🟣 Edge
1. Click the **lock icon** in the address bar
2. Set microphone to "Allow"
3. Refresh the page

## Common Error Messages

### "Permission denied" / "NotAllowedError"
- **Cause**: Microphone access was blocked
- **Solution**: Follow browser-specific steps above

### "No microphone found" / "NotFoundError"
- **Cause**: No microphone detected
- **Solution**: 
  - Connect a microphone to your device
  - Check system audio settings
  - Ensure microphone is enabled in device manager (Windows)

### "Microphone already in use" / "NotReadableError"
- **Cause**: Another application is using the microphone
- **Solution**:
  - Close other applications (Zoom, Skype, Discord, etc.)
  - Restart your browser
  - Restart the application using your microphone

### "HTTPS required" / "SecurityError"
- **Cause**: Site is not secure or not on localhost
- **Solution**:
  - Use `https://` instead of `http://`
  - For local development, use `localhost` or `127.0.0.1`

## Advanced Troubleshooting

### 🔄 Reset Browser Permissions
1. Go to browser settings
2. Find "Privacy & Security" or "Site Settings"
3. Look for "Microphone" permissions
4. Remove or reset permissions for this site
5. Refresh and try again

### 🧪 Test in Incognito/Private Mode
- Open an incognito/private window
- Navigate to the app
- This helps isolate extension conflicts

### 🔧 System-Level Issues
- **Windows**: Check Privacy Settings > Microphone
- **macOS**: System Preferences > Security & Privacy > Microphone
- **Linux**: Check ALSA/PulseAudio configuration

## Getting Help

### In-App Help
- Click the **❓ Help** button in the app
- Press **H** or **?** key for keyboard shortcut

### Keyboard Shortcuts
- **M**: Toggle microphone
- **H** or **?**: Show/hide help
- **Space** or **P**: Play/pause (file mode)
- **S**: Stop audio
- **Escape**: Close modals

## Technical Details

### Browser Compatibility
- ✅ Chrome 66+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

### Feature Detection
The app automatically checks for:
- Web Audio API support
- getUserMedia API support
- Microphone permissions
- WebGL support

### Fallback Strategies
If high-quality audio constraints fail, the app automatically tries:
1. Ideal configuration (no echo cancellation, 44.1kHz)
2. Basic configuration (fewer constraints)
3. Minimal configuration (just audio: true)

This ensures maximum compatibility across different devices and browsers.

## Still Having Issues?

If you're still experiencing problems:
1. Check the browser console for detailed error messages
2. Try a different browser
3. Test with a different microphone
4. Ensure your system audio drivers are up to date
5. Contact support with your browser version and error details
