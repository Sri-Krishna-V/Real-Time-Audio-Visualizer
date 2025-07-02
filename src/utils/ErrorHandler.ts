/**
 * ErrorHandler - Centralized error handling with graceful degradation
 * Provides user-friendly error messages and fallback strategies
 */

export interface ErrorInfo {
  code: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  userMessage: string;
  suggestions: string[];
  fallback?: () => void;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorContainer: HTMLElement | null = null;
  private activeErrors: Map<string, ErrorInfo> = new Map();

  private constructor() {
    this.createErrorContainer();
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Create error display container
   */
  private createErrorContainer(): void {
    this.errorContainer = document.createElement('div');
    this.errorContainer.id = 'error-container';
    this.errorContainer.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      max-width: 500px;
      display: none;
    `;
    document.body.appendChild(this.errorContainer);
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      this.handleError({
        code: 'GLOBAL_ERROR',
        message: event.message,
        severity: 'error',
        userMessage: 'An unexpected error occurred',
        suggestions: ['Try refreshing the page', 'Check browser console for details']
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        code: 'PROMISE_REJECTION',
        message: event.reason?.toString() || 'Unknown promise rejection',
        severity: 'error',
        userMessage: 'A background operation failed',
        suggestions: ['Try the operation again', 'Check your network connection']
      });
    });
  }

  /**
   * Handle a specific error with graceful degradation
   */
  handleError(errorInfo: ErrorInfo): void {
    console.error(`[${errorInfo.severity.toUpperCase()}] ${errorInfo.code}: ${errorInfo.message}`);
    
    // Store error info
    this.activeErrors.set(errorInfo.code, errorInfo);
    
    // Execute fallback if available
    if (errorInfo.fallback) {
      try {
        errorInfo.fallback();
      } catch (fallbackError) {
        console.error('Fallback function failed:', fallbackError);
      }
    }
    
    // Show user-friendly error if severe enough
    if (errorInfo.severity === 'error' || errorInfo.severity === 'critical') {
      this.showErrorToUser(errorInfo);
    }
  }

  /**
   * Show error to user with suggestions
   */
  private showErrorToUser(errorInfo: ErrorInfo): void {
    if (!this.errorContainer) return;

    const errorElement = document.createElement('div');
    errorElement.className = `error-notification ${errorInfo.severity}`;
    errorElement.style.cssText = `
      background: ${errorInfo.severity === 'critical' ? '#ff4444' : '#ff8844'};
      color: white;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 10px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease-out;
    `;

    const suggestionsHtml = errorInfo.suggestions
      .map(suggestion => `<li>${suggestion}</li>`)
      .join('');

    errorElement.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">
        ${errorInfo.userMessage}
      </div>
      <div style="font-size: 14px; margin-bottom: 10px;">
        Code: ${errorInfo.code}
      </div>
      ${suggestionsHtml ? `
        <div style="font-size: 13px;">
          <strong>Suggestions:</strong>
          <ul style="margin: 5px 0 0 20px; padding: 0;">
            ${suggestionsHtml}
          </ul>
        </div>
      ` : ''}
      <button onclick="this.parentElement.remove()" style="
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        cursor: pointer;
        float: right;
        margin-top: 10px;
      ">Dismiss</button>
      <div style="clear: both;"></div>
    `;

    this.errorContainer.appendChild(errorElement);
    this.errorContainer.style.display = 'block';

    // Auto-remove after 10 seconds for non-critical errors
    if (errorInfo.severity !== 'critical') {
      setTimeout(() => {
        if (errorElement.parentNode) {
          errorElement.remove();
          if (this.errorContainer?.children.length === 0) {
            this.errorContainer.style.display = 'none';
          }
        }
      }, 10000);
    }
  }

  /**
   * Get predefined error for common audio visualizer issues
   */
  static getAudioError(type: 'NO_WEBGL' | 'NO_WEBAUDIO' | 'MIC_PERMISSION' | 'FILE_LOAD_FAILED' | 'SHADER_COMPILE_FAILED'): ErrorInfo {
    switch (type) {
      case 'NO_WEBGL':
        return {
          code: 'NO_WEBGL_SUPPORT',
          message: 'WebGL is not supported or enabled',
          severity: 'critical',
          userMessage: 'Your browser doesn\'t support 3D graphics',
          suggestions: [
            'Update your browser to the latest version',
            'Enable hardware acceleration in browser settings',
            'Try a different browser (Chrome, Firefox, Safari)'
          ],
          fallback: () => {
            // Show static fallback visualization
            document.body.innerHTML = `
              <div style="text-align: center; padding: 50px; color: white; background: #000;">
                <h2>Audio Visualizer</h2>
                <p>3D visualization not available. Audio controls still work.</p>
              </div>
            `;
          }
        };

      case 'NO_WEBAUDIO':
        return {
          code: 'NO_WEBAUDIO_SUPPORT',
          message: 'Web Audio API is not supported',
          severity: 'critical',
          userMessage: 'Audio processing is not supported in this browser',
          suggestions: [
            'Update your browser to the latest version',
            'Try Chrome, Firefox, or Safari',
            'Enable JavaScript if disabled'
          ]
        };

      case 'MIC_PERMISSION':
        return {
          code: 'MICROPHONE_PERMISSION_DENIED',
          message: 'Microphone access denied',
          severity: 'warning',
          userMessage: 'Microphone access is required for live audio visualization',
          suggestions: [
            'Click the microphone icon in your browser\'s address bar',
            'Select "Allow" when prompted for microphone access',
            'Check browser settings for microphone permissions',
            'Try uploading an audio file instead'
          ]
        };

      case 'FILE_LOAD_FAILED':
        return {
          code: 'AUDIO_FILE_LOAD_FAILED',
          message: 'Failed to load audio file',
          severity: 'error',
          userMessage: 'Could not load the selected audio file',
          suggestions: [
            'Try a different audio file format (MP3, WAV, OGG)',
            'Ensure the file is not corrupted',
            'Check that the file size is reasonable (< 100MB)',
            'Use microphone input instead'
          ]
        };

      case 'SHADER_COMPILE_FAILED':
        return {
          code: 'SHADER_COMPILATION_FAILED',
          message: 'Graphics shader compilation failed',
          severity: 'warning',
          userMessage: 'Advanced graphics features are unavailable',
          suggestions: [
            'Update your graphics drivers',
            'Try reducing visual quality settings',
            'Basic visualization will still work'
          ],
          fallback: () => {
            console.log('Falling back to basic Three.js materials');
            // This would trigger fallback to PointsMaterial instead of ShaderMaterial
          }
        };

      default:
        return {
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
          severity: 'error',
          userMessage: 'Something went wrong',
          suggestions: ['Try refreshing the page']
        };
    }
  }

  /**
   * Clear all errors
   */
  clearAllErrors(): void {
    this.activeErrors.clear();
    if (this.errorContainer) {
      this.errorContainer.innerHTML = '';
      this.errorContainer.style.display = 'none';
    }
  }

  /**
   * Check if a specific error is active
   */
  hasError(code: string): boolean {
    return this.activeErrors.has(code);
  }

  /**
   * Get all active errors
   */
  getActiveErrors(): ErrorInfo[] {
    return Array.from(this.activeErrors.values());
  }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
