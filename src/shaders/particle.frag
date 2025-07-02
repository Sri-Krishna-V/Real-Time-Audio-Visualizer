// Fragment shader for particle system
// Creates glowing, audio-reactive particles

uniform float uTime;
uniform float uOverallLevel;

varying vec3 vColor;
varying float vAlpha;

void main() {
    // Create circular particle shape
    vec2 center = gl_PointCoord - 0.5;
    float distance = length(center);
    
    // Discard pixels outside circle
    if (distance > 0.5) discard;
    
    // Create glow effect
    float glow = 1.0 - smoothstep(0.0, 0.5, distance);
    glow = pow(glow, 2.0);
    
    // Audio-reactive color intensity
    vec3 color = vColor * (1.0 + uOverallLevel);
    
    // Pulsing effect based on time and audio
    float pulse = sin(uTime * 10.0) * uOverallLevel * 0.3 + 0.7;
    
    // Final color with alpha blending
    gl_FragColor = vec4(color * glow * pulse, vAlpha * glow);
}
