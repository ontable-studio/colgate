import { describe, expect, it } from 'vitest';
import {
  comboDetune,
  DEFAULT_AUDIO_SETTINGS,
  nextVolume,
  parseAudioSettings,
  VOLUME_STEPS,
} from '@/domain/audioSettings';

describe('parseAudioSettings', () => {
  it('uses defaults when nothing is stored', () => {
    expect(parseAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('reads valid stored settings', () => {
    expect(parseAudioSettings('{"muted":true,"volume":0.5}')).toEqual({ muted: true, volume: 0.5 });
  });

  it('clamps the volume and ignores wrong types', () => {
    expect(parseAudioSettings('{"volume":7}').volume).toBe(1);
    expect(parseAudioSettings('{"volume":-3}').volume).toBe(0);
    expect(parseAudioSettings('{"volume":"loud","muted":"yes"}')).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('survives corrupt JSON', () => {
    expect(parseAudioSettings('{nope')).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings('null')).toEqual(DEFAULT_AUDIO_SETTINGS);
  });
});

describe('nextVolume', () => {
  it('steps up through the presets and wraps to the quietest', () => {
    expect(nextVolume(0.25)).toBe(0.5);
    expect(nextVolume(0.5)).toBe(0.75);
    expect(nextVolume(0.75)).toBe(1);
    expect(nextVolume(1)).toBe(VOLUME_STEPS[0]);
  });

  it('snaps an in-between value to the next preset', () => {
    expect(nextVolume(0.6)).toBe(0.75);
    expect(nextVolume(0)).toBe(0.25);
  });
});

describe('comboDetune', () => {
  it('starts at the base pitch and rises a semitone per capsule in a row', () => {
    expect(comboDetune(0)).toBe(0);
    expect(comboDetune(1)).toBe(0);
    expect(comboDetune(2)).toBe(100);
    expect(comboDetune(5)).toBe(400);
  });

  it('stops rising after the cap', () => {
    expect(comboDetune(9)).toBe(800);
    expect(comboDetune(40)).toBe(800);
  });
});
