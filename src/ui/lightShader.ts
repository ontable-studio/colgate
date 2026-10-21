import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';

const KEY = 'ambient-light';

/**
 * The background photo with ambient light on top, computed per pixel every frame (`time` is in
 * seconds; `iChannel0` is the photo):
 *  - the two golden swooshes in the photo sway slowly and a bright pulse runs along each of them;
 *  - beams fanning out from a point above the top edge. Each one shines in turn on its own
 *    rhythm and, between two turns, comes back somewhere else;
 *  - soft glowing particles in three sizes that drift upward and twinkle all over the screen.
 * Kept cheap: one small loop and a few hashes per pixel.
 */
const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float time;
uniform vec2 resolution;
uniform sampler2D iChannel0;

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

// How much a photo colour belongs to a golden swoosh: bright and yellow-orange, not the red field.
float swoosh(vec3 c) {
  return smoothstep(0.55, 0.85, c.g) * smoothstep(0.3, 0.0, c.b - 0.2);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float aspect = resolution.x / resolution.y;
  vec2 tex = vec2(uv.x, 1.0 - uv.y);

  // Sway: the lines drift up and down a little, more toward the middle of the screen.
  float sway = sin(uv.x * 3.2 + time * 0.55) * 0.0045 + sin(uv.x * 7.0 - time * 0.8) * 0.0015;
  vec3 photo = texture2D(iChannel0, tex + vec2(0.0, sway)).rgb;
  vec3 still = texture2D(iChannel0, tex).rgb;
  float line = max(swoosh(photo), swoosh(still));

  // A bright pulse travels along each line (they run in opposite directions) and the line breathes (only the line: the red field itself stays steady).
  float pulseA = pow(0.5 + 0.5 * sin(uv.x * 5.0 - time * 1.3), 4.0);
  float pulseB = pow(0.5 + 0.5 * sin(uv.x * 4.0 + time * 1.0 + 2.0), 4.0);
  float pulse = mix(pulseA, pulseB, step(0.65, uv.y));
  float breathe = 0.85 + 0.15 * sin(time * 1.6);
  vec3 color = mix(photo, photo * breathe, line);
  color += vec3(1.0, 0.78, 0.35) * line * (0.12 + 0.55 * pulse);

  // Beams from above, added to the photo's own light. Each has its own period and picks a new
  // spot for its next turn once it has faded out.
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 1.18);
  float dist = length(p);
  float angle = atan(p.x, -p.y);
  float beams = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float h1 = hash(vec2(fi, 1.3));
    float h2 = hash(vec2(fi, 5.7));
    float h3 = hash(vec2(fi, 9.1));
    float arg = time * (0.4 + 0.3 * h3) + fi * 5.3 + h1 * 6.2832;
    float cycle = (arg + 1.5708) / 6.2832;
    float turn = floor(cycle);
    float center = (fi - 3.5) * 0.2 + (hash(vec2(fi, turn)) - 0.5) * 0.35
                 + (fract(cycle) - 0.5) * 0.1;
    float width = 0.05 + 0.06 * h2;
    float d = (angle - center) / width;
    float shape = exp(-d * d);
    float lit = smoothstep(0.3, 1.0, 0.5 + 0.5 * sin(arg));
    beams += shape * lit;
  }
  float falloff = smoothstep(1.9, 0.05, dist);
  float haze = 0.75 + 0.5 * noise(vec2(p.x * 2.2 + time * 0.05, p.y * 1.6 - time * 0.12));
  color += vec3(1.0, 0.55, 0.38) * min(beams, 1.2) * falloff * haze * 0.3;

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
    float twinkle = pow(0.5 + 0.5 * sin(time * (0.8 + 1.4 * hash(key + 5.5)) + seed * 40.0), 2.0);
    float present = step(0.8, seed);
    color += vec3(1.0, 0.6, 0.48) * glow * twinkle * present * (0.32 - 0.05 * fl);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

/** Full-screen photo with animated light; without WebGL the still photo is shown. */
export function addLightShader(scene: Phaser.Scene): void {
  if (scene.renderer.type !== Phaser.WEBGL) {
    scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-photo');
    return;
  }
  if (!scene.cache.shader.has(KEY)) {
    scene.cache.shader.add(KEY, new Phaser.Display.BaseShader(KEY, FRAGMENT));
  }
  // The photo is not a power-of-two size, so it must clamp instead of repeat (or it samples black).
  scene.add.shader(KEY, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, ['bg-photo'], {
    wrapS: 'clamp_to_edge',
    wrapT: 'clamp_to_edge',
  });
}
