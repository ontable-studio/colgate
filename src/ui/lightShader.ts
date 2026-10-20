import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';

const KEY = 'ambient-light';

/**
 * Ambient light from above, computed per pixel every frame: soft volumetric beams fanning out from
 * a point above the top edge, each one drifting and breathing on its own, with haze moving through
 * them and a few dust motes catching the light. Nothing here is a drawn shape, so it moves like
 * real light through smoke. (Kept cheap: a few sines and one hash noise, no loops over many octaves.)
 */
const FRAGMENT = `
precision mediump float;
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

  // Beams: noise across the angle gives uneven rays; time slides it so the beams drift, and a
  // second slower layer makes them swell and fade.
  float t = time * 0.0004;
  float beams = noise(vec2(angle * 9.0 + t * 90.0, 1.7));
  beams = beams * 0.65 + noise(vec2(angle * 17.0 - t * 140.0, 8.3)) * 0.35;
  beams = smoothstep(0.38, 0.85, beams);
  float breathe = 0.65 + 0.35 * sin(time * 0.0007 + angle * 5.0);
  float falloff = smoothstep(1.9, 0.05, dist);
  float spread = smoothstep(1.1, 0.25, abs(angle));

  // Haze drifting slowly downward through the beams.
  float haze = noise(vec2(p.x * 2.2 + t * 30.0, p.y * 1.6 - t * 55.0));
  haze = 0.7 + 0.5 * haze;

  float light = beams * breathe * falloff * spread * haze;
  vec3 color = red + vec3(1.0, 0.55, 0.38) * light * 0.55;

  // A warm pool of light at the top.
  color += vec3(1.0, 0.45, 0.3) * smoothstep(0.75, 0.0, dist) * (0.28 + 0.06 * sin(time * 0.0011));

  // Dust motes: sparse points that float up slowly and twinkle.
  vec2 g = vec2(uv.x * aspect, uv.y) * 9.0 + vec2(0.0, -time * 0.00005 * 9.0);
  vec2 cell = floor(g);
  vec2 local = fract(g) - 0.5;
  float seed = hash(cell);
  vec2 offset = vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
  float mote = smoothstep(0.06, 0.0, length(local - offset * 0.6));
  mote *= step(0.78, seed) * (0.5 + 0.5 * sin(time * 0.002 + seed * 40.0));
  color += vec3(1.0, 0.8, 0.6) * mote * 0.5 * falloff;

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
