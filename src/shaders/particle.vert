// Vertex shader for particle system
// Can be used for more advanced particle effects

uniform float uTime;
uniform float uBassLevel;
uniform float uMidLevel;
uniform float uTrebleLevel;

attribute vec3 aPosition;
attribute vec3 aVelocity;
attribute float aSize;

varying vec3 vColor;
varying float vAlpha;

void main() {
    // Calculate audio-reactive position offset
    vec3 position = aPosition;
    
    // Add bass-driven displacement
    position += aVelocity * uBassLevel * 2.0;
    
    // Add time-based animation
    position.y += sin(uTime + position.x * 10.0) * uMidLevel * 0.5;
    position.x += cos(uTime + position.z * 10.0) * uTrebleLevel * 0.3;
    
    // Calculate size based on audio
    float audioSize = aSize * (1.0 + uBassLevel * 2.0);
    
    // Project to screen space
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = audioSize * (300.0 / -mvPosition.z);
    
    // Pass varying values to fragment shader
    vColor = vec3(uTrebleLevel, uMidLevel, uBassLevel);
    vAlpha = 0.8 + uBassLevel * 0.2;
}
