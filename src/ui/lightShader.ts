import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';

const KEY = 'ambient-light';

/**
 * Ambient light from above, computed per pixel every frame (`time` is in seconds):
 *  - beams fanning out from a point above the top edge. Each one shines in turn on its own
 *    rhythm and, between two turns, comes back somewhere else, so the light seems to wander at
 *    random across the screen;
 *  - soft glowing particles in three sizes that drift upward and twinkle all over the screen.
 * Nothing is a drawn shape. Kept cheap: one small loop and a few hashes per pixel.
 */
const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float time;
uniform vec2 resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float aspect = resolution.x / resolution.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 1.18);
  float dist = length(p);
  float angle = atan(p.x, -p.y);

  // Base red: bright under the light source, dark toward the corners.
  vec3 red = mix(vec3(0.42, 0.03, 0.06), vec3(0.96, 0.08, 0.12), smoothstep(1.7, 0.1, dist));
  float vignette = smoothstep(1.25, 0.35, length(uv - vec2(0.5, 0.5)));
  red *= 0.55 + 0.45 * vignette;

  // Beams that take turns. Each has its own period (about 3.5 to 7 s) and lights up for part of
  // it; when it has faded out completely it picks a new spot for its next turn.
  float beams = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float h1 = hash(vec2(fi, 1.3));
    float h2 = hash(vec2(fi, 5.7));
    float h3 = hash(vec2(fi, 9.1));
    float arg = time * (0.9 + 0.9 * h3) + fi * 5.3 + h1 * 6.2832;
    float turn = floor((arg + 1.5708) / 6.2832);
    float center = (fi - 3.5) * 0.2 + (hash(vec2(fi, turn)) - 0.5) * 0.35
                 + 0.04 * sin(time * (0.2 + 0.3 * h1) + fi);
    float width = 0.05 + 0.06 * h2;
    float d = (angle - center) / width;
    float shape = exp(-d * d);
    float lit = smoothstep(0.5, 1.0, 0.5 + 0.5 * sin(arg));
    beams += shape * lit;
  }
  float falloff = smoothstep(1.9, 0.05, dist);
  float haze = 0.75 + 0.5 * noise(vec2(p.x * 2.2 + time * 0.05, p.y * 1.6 - time * 0.12));
  float light = min(beams, 1.2) * falloff * haze;
  vec3 color = red + vec3(1.0, 0.55, 0.38) * light * 0.7;

  // A warm pool of light at the top, breathing slowly.
  color += vec3(1.0, 0.45, 0.3) * smoothstep(0.75, 0.0, dist) * (0.28 + 0.06 * sin(time * 1.1));

  // Glowing particles: three layers (large and few, small and many) that float up and twinkle.
  for (int l = 0; l < 3; l++) {
    float fl = float(l);
    float scale = 5.0 + fl * 3.5;
    vec2 g = vec2(uv.x * aspect, uv.y) * scale + vec2(0.0, -time * (0.25 + 0.15 * fl));
    vec2 cell = floor(g);
    vec2 local = fract(g) - 0.5;
    vec2 key = cell + fl * 17.0;
    float seed = hash(key);
    vec2 offset = (vec2(hash(key + 3.1), hash(key + 7.7)) - 0.5) * 0.6;
    float radius = 0.08 + 0.08 * hash(key + 11.3);
    float r = length(local - offset) / radius;
    float glow = exp(-r * r * 1.6);
    float twinkle = pow(0.5 + 0.5 * sin(time * (1.4 + 2.6 * hash(key + 5.5)) + seed * 40.0), 2.0);
    float present = step(0.45, seed);
    color += vec3(1.0, 0.6, 0.48) * glow * twinkle * present * (0.5 - 0.08 * fl);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

/** Full-screen animated light; on a renderer without WebGL the still `bg-main` image is used. */
export function addLightShader(scene: Phaser.Scene): void {
  if (scene.renderer.type !== Phaser.WEBGL) {
    scene.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-main')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    return;
  }
  if (!scene.cache.shader.has(KEY)) {
    scene.cache.shader.add(KEY, new Phaser.Display.BaseShader(KEY, FRAGMENT));
  }
  scene.add.shader(KEY, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
}
