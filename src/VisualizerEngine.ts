/**
 * VisualizerEngine - Core 3D rendering and animation system
 * Optimized for 60fps performance with efficient geometry updates
 */

import * as THREE from 'three';
import { AudioFrequencyData } from './AudioAnalyzer';
import { Vector3Pool } from './utils/ObjectPool';
import { DeviceCapabilities } from './utils/DeviceCapabilities';
import { ErrorHandler } from './utils/ErrorHandler';

export interface VisualizerConfig {
  geometrySegments: number;
  particleCount: number;
  morphingIntensity: number;
  colorSaturation: number;
  enableWireframe: boolean;
}

export class VisualizerEngine {
  // Core Three.js components
  private scene: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  
  // Main reactive geometry
  private icosphere!: THREE.Mesh;
  private icosphereGeometry!: THREE.IcosahedronGeometry;
  private icosphereMaterial!: THREE.MeshPhongMaterial;
  private originalVertices!: Float32Array;
  
  // Particle system
  private particleSystem!: THREE.Points;
  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.ShaderMaterial | THREE.PointsMaterial;
  private particlePositions!: Float32Array;
  private particleVelocities!: Float32Array;
  
  // Lighting
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  
  // Animation state
  private clock: THREE.Clock;
  private isAnimating = false;
  
  // Performance optimization
  private vector3Pool: Vector3Pool;
  private deviceCapabilities: DeviceCapabilities;
  private errorHandler: ErrorHandler;
  
  // Configuration
  private config: VisualizerConfig = {
    geometrySegments: 32,
    particleCount: 1000,
    morphingIntensity: 1.0,
    colorSaturation: 0.8,
    enableWireframe: false
  };

  constructor(container: HTMLElement, config?: Partial<VisualizerConfig>) {
    // Detect device capabilities and adjust config accordingly
    this.deviceCapabilities = new DeviceCapabilities();
    const deviceQuality = this.deviceCapabilities.getQualitySettings();
    
    // Merge user config with device-optimized defaults
    this.config = {
      geometrySegments: deviceQuality.geometrySegments,
      particleCount: deviceQuality.particleCount,
      morphingIntensity: 1.0,
      colorSaturation: 0.8,
      enableWireframe: false,
      ...config // User config overrides device settings
    };

    console.log('Device detected:', this.deviceCapabilities.getDeviceDescription());
    console.log('Auto-configured quality:', deviceQuality);

    // Initialize core components
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.vector3Pool = new Vector3Pool(200); // Pre-allocate vectors for calculations
    this.errorHandler = ErrorHandler.getInstance();
    
    this.setupCamera();
    this.setupRenderer(container);
    this.setupLighting();
    this.setupMainGeometry();
    
    // Initialize particle system asynchronously
    this.setupParticleSystem().catch(error => {
      console.error('Failed to initialize particle system:', error);
    });
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Setup camera with proper FOV and positioning
   */
  private setupCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Setup WebGL renderer with device-optimized performance settings
   */
  private setupRenderer(container: HTMLElement): void {
    const qualitySettings = this.deviceCapabilities.getQualitySettings();
    
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: !this.deviceCapabilities.getDeviceInfo().isMobile,
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(qualitySettings.pixelRatio);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.shadowMap.enabled = false; // Disable shadows for performance
    
    // Configure anisotropic filtering if supported
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    if (maxAnisotropy > 1) {
      console.log(`Max anisotropy supported: ${maxAnisotropy}, using: ${Math.min(qualitySettings.maxAnisotropy, maxAnisotropy)}`);
    }
    
    container.appendChild(this.renderer.domElement);
  }

  /**
   * Setup scene lighting
   */
  private setupLighting(): void {
    // Ambient light for base visibility
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(this.ambientLight);
    
    // Directional light for form definition
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(-1, 1, 1);
    this.scene.add(this.directionalLight);
  }

  /**
   * Setup main reactive icosphere geometry
   */
  private setupMainGeometry(): void {
    // Create icosphere with enough vertices for smooth morphing
    this.icosphereGeometry = new THREE.IcosahedronGeometry(1.5, this.config.geometrySegments);
    
    // Store original vertex positions for morphing calculations
    const positions = this.icosphereGeometry.attributes.position;
    this.originalVertices = new Float32Array(positions.array);
    
    // Create material with dynamic properties
    this.icosphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      emissive: 0x001122,
      shininess: 100,
      wireframe: this.config.enableWireframe,
      transparent: true,
      opacity: 0.9
    });
    
    // Create mesh
    this.icosphere = new THREE.Mesh(this.icosphereGeometry, this.icosphereMaterial);
    this.scene.add(this.icosphere);
  }

  /**
   * Setup particle system with custom shaders for advanced effects
   */
  private async setupParticleSystem(): Promise<void> {
    this.particleGeometry = new THREE.BufferGeometry();
    
    // Initialize particle positions and velocities
    this.particlePositions = new Float32Array(this.config.particleCount * 3);
    this.particleVelocities = new Float32Array(this.config.particleCount * 3);
    const colors = new Float32Array(this.config.particleCount * 3);
    const sizes = new Float32Array(this.config.particleCount);
    
    // Distribute particles in a sphere around the main geometry
    for (let i = 0; i < this.config.particleCount; i++) {
      const i3 = i * 3;
      
      // Random spherical distribution
      const radius = 3 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      this.particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      this.particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      this.particlePositions[i3 + 2] = radius * Math.cos(phi);
      
      // Initialize velocities
      this.particleVelocities[i3] = (Math.random() - 0.5) * 0.02;
      this.particleVelocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      this.particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
      
      // Set particle colors
      colors[i3] = 0.2 + Math.random() * 0.8;     // R
      colors[i3 + 1] = 0.8 + Math.random() * 0.2; // G
      colors[i3 + 2] = 1.0;                       // B
      
      // Set random sizes
      sizes[i] = 0.05 + Math.random() * 0.1;
    }
    
    // Set geometry attributes
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('aVelocity', new THREE.BufferAttribute(this.particleVelocities, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    
    // Load custom shaders with error handling
    try {
      const vertexShader = await this.loadShader('/src/shaders/particle.vert');
      const fragmentShader = await this.loadShader('/src/shaders/particle.frag');
      
      // Create custom shader material with audio uniforms
      this.particleMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0.0 },
          uBassLevel: { value: 0.0 },
          uMidLevel: { value: 0.0 },
          uTrebleLevel: { value: 0.0 },
          uOverallLevel: { value: 0.0 }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      console.log('Custom particle shaders loaded successfully');
    } catch (error) {
      // Fallback to basic material if shader loading fails
      this.errorHandler.handleError(ErrorHandler.getAudioError('SHADER_COMPILE_FAILED'));
      
      this.particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      }) as any; // Type assertion for compatibility
      
      console.log('Falling back to basic particle material');
    }
    
    // Create particle system
    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleSystem);
  }

  /**
   * Load shader from file for development hot reloading
   */
  private async loadShader(path: string): Promise<string> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load shader: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.warn(`Failed to load shader from ${path}, using fallback`);
      // Return fallback shaders
      if (path.includes('.vert')) {
        return this.getFallbackVertexShader();
      } else {
        return this.getFallbackFragmentShader();
      }
    }
  }

  /**
   * Fallback vertex shader if file loading fails
   */
  private getFallbackVertexShader(): string {
    return `
      uniform float uTime;
      uniform float uBassLevel;
      attribute vec3 aVelocity;
      attribute float aSize;
      varying vec3 vColor;
      
      void main() {
        vec3 pos = position + aVelocity * uBassLevel;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * (300.0 / -mvPosition.z) * (1.0 + uBassLevel);
        vColor = color;
      }
    `;
  }

  /**
   * Fallback fragment shader if file loading fails
   */
  private getFallbackFragmentShader(): string {
    return `
      varying vec3 vColor;
      
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;
        
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(vColor * glow, glow);
      }
    `;
  }

  /**
   * Update visualization based on audio frequency data
   */
  updateVisualization(audioData: AudioFrequencyData): void {
    if (!this.isAnimating) return;
    
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    // Update main geometry morphing
    this.updateGeometryMorphing(audioData, elapsedTime);
    
    // Update material properties
    this.updateMaterialProperties(audioData, elapsedTime);
    
    // Update particle system
    this.updateParticleSystem(audioData, deltaTime);
    
    // Update camera rotation for dynamic viewpoint
    this.updateCameraMovement(audioData, elapsedTime);
  }

  /**
   * Update geometry vertex positions based on frequency data
   * Uses object pooling for vector calculations to reduce GC pressure
   */
  private updateGeometryMorphing(audioData: AudioFrequencyData, time: number): void {
    const positions = this.icosphereGeometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    const bassIntensity = audioData.bassLevel * this.config.morphingIntensity;
    const midIntensity = audioData.midLevel * this.config.morphingIntensity;
    const trebleIntensity = audioData.trebleLevel * this.config.morphingIntensity;
    
    // Use pooled vectors for calculations
    const vertex = this.vector3Pool.acquire();
    const originalVertex = this.vector3Pool.acquire();
    
    // Apply vertex displacement based on frequency analysis
    for (let i = 0; i < positionArray.length; i += 3) {
      const originalX = this.originalVertices[i];
      const originalY = this.originalVertices[i + 1];
      const originalZ = this.originalVertices[i + 2];
      
      originalVertex.set(originalX, originalY, originalZ);
      
      // Calculate displacement based on vertex position and audio data
      const vertexIndex = i / 3;
      const normalizedIndex = vertexIndex / (positionArray.length / 3);
      
      // Different frequency bands affect different vertex regions
      let displacement = 1.0;
      
      if (normalizedIndex < 0.33) {
        // Bass affects lower vertices
        displacement += bassIntensity * 0.5;
      } else if (normalizedIndex < 0.66) {
        // Mid frequencies affect middle vertices
        displacement += midIntensity * 0.3;
      } else {
        // Treble affects upper vertices
        displacement += trebleIntensity * 0.4;
      }
      
      // Add some time-based animation for smoother movement
      const timeOffset = time * 2 + vertexIndex * 0.1;
      displacement += Math.sin(timeOffset) * audioData.overallLevel * 0.1;
      
      // Apply displacement using pooled vector
      vertex.copy(originalVertex).multiplyScalar(displacement);
      
      // Update position array
      positionArray[i] = vertex.x;
      positionArray[i + 1] = vertex.y;
      positionArray[i + 2] = vertex.z;
    }
    
    // Return vectors to pool
    this.vector3Pool.release(vertex);
    this.vector3Pool.release(originalVertex);
    
    positions.needsUpdate = true;
    this.icosphereGeometry.computeVertexNormals();
  }

  /**
   * Update material colors and properties
   */
  private updateMaterialProperties(audioData: AudioFrequencyData, time: number): void {
    // Dynamic color shifting based on frequency content
    const hue = (time * 0.1 + audioData.bassLevel * 0.5) % 1;
    const saturation = this.config.colorSaturation;
    const lightness = 0.5 + audioData.overallLevel * 0.3;
    
    const color = new THREE.Color().setHSL(hue, saturation, lightness);
    this.icosphereMaterial.color = color;
    
    // Dynamic emissive intensity
    const emissiveIntensity = audioData.overallLevel * 0.5;
    this.icosphereMaterial.emissive.setRGB(
      emissiveIntensity * 0.2,
      emissiveIntensity * 0.4,
      emissiveIntensity * 0.6
    );
    
    // Pulsing opacity based on beat detection
    this.icosphereMaterial.opacity = 0.7 + audioData.bassLevel * 0.3;
  }

  /**
   * Update particle system animation
   */
  private updateParticleSystem(audioData: AudioFrequencyData, deltaTime: number): void {
    const positions = this.particleGeometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    // Update particle positions with physics simulation
    for (let i = 0; i < this.config.particleCount; i++) {
      const i3 = i * 3;
      
      // Apply audio-reactive forces
      const audioForce = audioData.overallLevel * 0.1;
      this.particleVelocities[i3] += (Math.random() - 0.5) * audioForce * deltaTime;
      this.particleVelocities[i3 + 1] += (Math.random() - 0.5) * audioForce * deltaTime;
      this.particleVelocities[i3 + 2] += (Math.random() - 0.5) * audioForce * deltaTime;
      
      // Apply velocity damping
      this.particleVelocities[i3] *= 0.99;
      this.particleVelocities[i3 + 1] *= 0.99;
      this.particleVelocities[i3 + 2] *= 0.99;
      
      // Update positions
      positionArray[i3] += this.particleVelocities[i3];
      positionArray[i3 + 1] += this.particleVelocities[i3 + 1];
      positionArray[i3 + 2] += this.particleVelocities[i3 + 2];
      
      // Boundary checking - keep particles in reasonable range
      const distance = Math.sqrt(
        positionArray[i3] * positionArray[i3] +
        positionArray[i3 + 1] * positionArray[i3 + 1] +
        positionArray[i3 + 2] * positionArray[i3 + 2]
      );
      
      if (distance > 8) {
        // Reset particle to inner sphere
        const resetRadius = 3 + Math.random();
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positionArray[i3] = resetRadius * Math.sin(phi) * Math.cos(theta);
        positionArray[i3 + 1] = resetRadius * Math.sin(phi) * Math.sin(theta);
        positionArray[i3 + 2] = resetRadius * Math.cos(phi);
      }
    }
    
    positions.needsUpdate = true;
    
    // Update shader uniforms for audio-reactive effects (ShaderMaterial only)
    if (this.particleMaterial instanceof THREE.ShaderMaterial && this.particleMaterial.uniforms) {
      this.particleMaterial.uniforms.uBassLevel.value = audioData.bassLevel;
      this.particleMaterial.uniforms.uMidLevel.value = audioData.midLevel;
      this.particleMaterial.uniforms.uTrebleLevel.value = audioData.trebleLevel;
      this.particleMaterial.uniforms.uOverallLevel.value = audioData.overallLevel;
      this.particleMaterial.uniforms.uTime.value = this.clock.getElapsedTime();
    } else if (this.particleMaterial instanceof THREE.PointsMaterial) {
      // Update basic material properties for fallback
      this.particleMaterial.size = 0.05 + audioData.trebleLevel * 0.1;
    }
    
    // Update overall opacity
    this.particleMaterial.opacity = 0.6 + audioData.midLevel * 0.4;
  }

  /**
   * Update camera movement for dynamic perspective
   */
  private updateCameraMovement(audioData: AudioFrequencyData, time: number): void {
    // Subtle camera rotation based on audio
    const rotationSpeed = 0.1 + audioData.overallLevel * 0.2;
    this.camera.position.x = Math.cos(time * rotationSpeed) * 5;
    this.camera.position.z = Math.sin(time * rotationSpeed) * 5;
    this.camera.position.y = Math.sin(time * rotationSpeed * 0.5) * 2;
    
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Render the scene
   */
  render(): void {
    if (!this.isAnimating) return;
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Start animation loop
   */
  startAnimation(): void {
    this.isAnimating = true;
    this.clock.start();
  }

  /**
   * Stop animation loop
   */
  stopAnimation(): void {
    this.isAnimating = false;
  }

  /**
   * Toggle wireframe mode
   */
  toggleWireframe(): void {
    this.config.enableWireframe = !this.config.enableWireframe;
    this.icosphereMaterial.wireframe = this.config.enableWireframe;
  }

  /**
   * Toggle particle system visibility
   */
  toggleParticles(): void {
    this.particleSystem.visible = !this.particleSystem.visible;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VisualizerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopAnimation();
    
    // Dispose geometries
    this.icosphereGeometry.dispose();
    this.particleGeometry.dispose();
    
    // Dispose materials
    this.icosphereMaterial.dispose();
    this.particleMaterial.dispose();
    
    // Clean up renderer
    this.renderer.dispose();
    
    // Remove resize listener
    window.removeEventListener('resize', this.handleResize);
  }

  /**
   * Get current particle count for performance monitoring
   */
  getParticleCount(): number {
    return this.config.particleCount;
  }

  /**
   * Get vertex count for performance monitoring
   */
  getVertexCount(): number {
    return this.icosphereGeometry ? this.icosphereGeometry.attributes.position.count : 0;
  }
}
