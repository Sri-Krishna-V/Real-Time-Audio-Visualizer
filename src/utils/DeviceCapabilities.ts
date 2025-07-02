/**
 * DeviceCapabilities - Detect and adapt to device performance capabilities
 * Implements progressive enhancement for different device types
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isLowEnd: boolean;
  hasWebGL2: boolean;
  hasHighDPI: boolean;
  maxTextureSize: number;
  gpuTier: 'low' | 'medium' | 'high';
  memoryGB: number;
  cores: number;
}

export interface QualitySettings {
  particleCount: number;
  geometrySegments: number;
  enableComplexShaders: boolean;
  enablePostProcessing: boolean;
  shadowMapSize: number;
  maxAnisotropy: number;
  pixelRatio: number;
}

export class DeviceCapabilities {
  private deviceInfo: DeviceInfo;
  private qualitySettings: QualitySettings;

  constructor() {
    this.deviceInfo = this.detectDeviceInfo();
    this.qualitySettings = this.determineQualitySettings();
  }

  /**
   * Detect device capabilities and performance characteristics
   */
  private detectDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;

    // Device type detection
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
    
    // Performance indicators
    const cores = navigator.hardwareConcurrency || 4;
    const memoryGB = (navigator as any).deviceMemory || 4; // Rough estimate
    
    // GPU capabilities
    let maxTextureSize = 2048;
    let gpuTier: 'low' | 'medium' | 'high' = 'medium';
    
    if (gl) {
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string).toLowerCase();
        
        // Simple GPU tier detection based on renderer string
        if (renderer.includes('intel') && renderer.includes('hd')) {
          gpuTier = 'low';
        } else if (renderer.includes('gtx') || renderer.includes('rtx') || renderer.includes('radeon')) {
          gpuTier = 'high';
        }
      }
    }

    // Low-end device detection
    const isLowEnd = (
      isMobile && cores <= 2 && memoryGB <= 2
    ) || gpuTier === 'low' || maxTextureSize < 4096;

    return {
      isMobile,
      isTablet,
      isLowEnd,
      hasWebGL2: !!gl2,
      hasHighDPI: window.devicePixelRatio > 1.5,
      maxTextureSize,
      gpuTier,
      memoryGB,
      cores
    };
  }

  /**
   * Determine optimal quality settings based on device capabilities
   */
  private determineQualitySettings(): QualitySettings {
    const { isMobile, isLowEnd, gpuTier, hasHighDPI } = this.deviceInfo;

    if (isLowEnd) {
      return {
        particleCount: 200,
        geometrySegments: 8,
        enableComplexShaders: false,
        enablePostProcessing: false,
        shadowMapSize: 512,
        maxAnisotropy: 1,
        pixelRatio: 1
      };
    }

    if (isMobile) {
      return {
        particleCount: 500,
        geometrySegments: 16,
        enableComplexShaders: false,
        enablePostProcessing: false,
        shadowMapSize: 1024,
        maxAnisotropy: 2,
        pixelRatio: hasHighDPI ? 2 : 1
      };
    }

    if (gpuTier === 'high') {
      return {
        particleCount: 2000,
        geometrySegments: 64,
        enableComplexShaders: true,
        enablePostProcessing: true,
        shadowMapSize: 2048,
        maxAnisotropy: 16,
        pixelRatio: Math.min(window.devicePixelRatio, 2)
      };
    }

    // Default medium quality
    return {
      particleCount: 1000,
      geometrySegments: 32,
      enableComplexShaders: true,
      enablePostProcessing: false,
      shadowMapSize: 1024,
      maxAnisotropy: 4,
      pixelRatio: Math.min(window.devicePixelRatio, 2)
    };
  }

  /**
   * Get device information
   */
  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  /**
   * Get recommended quality settings
   */
  getQualitySettings(): QualitySettings {
    return { ...this.qualitySettings };
  }

  /**
   * Check if device supports a specific feature
   */
  supports(feature: 'webgl2' | 'complexShaders' | 'postProcessing' | 'highParticleCount'): boolean {
    switch (feature) {
      case 'webgl2':
        return this.deviceInfo.hasWebGL2;
      case 'complexShaders':
        return this.qualitySettings.enableComplexShaders;
      case 'postProcessing':
        return this.qualitySettings.enablePostProcessing;
      case 'highParticleCount':
        return this.qualitySettings.particleCount >= 1000;
      default:
        return false;
    }
  }

  /**
   * Get human-readable device description
   */
  getDeviceDescription(): string {
    const { isMobile, isTablet, gpuTier, cores, memoryGB } = this.deviceInfo;
    
    let deviceType = 'Desktop';
    if (isMobile) deviceType = 'Mobile';
    else if (isTablet) deviceType = 'Tablet';
    
    return `${deviceType} | ${cores} cores | ${memoryGB}GB RAM | GPU: ${gpuTier}`;
  }
}
