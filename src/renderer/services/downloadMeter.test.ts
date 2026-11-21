import { describe, it, expect } from 'vitest';
import {
  DownloadMeter, formatSpeed, formatEta, type RawProgress,
} from './downloadMeter';

function meterAt(_times: number[]) {
  return new DownloadMeter(() => 0);
}

const ev = (over: Partial<RawProgress>): RawProgress => ({
  file: 'model.onnx',
  received: 0,
  total: 100,
  downloaded: 0,
  totalBytes: 100,
  ...over,
});

describe('DownloadMeter', () => {
  it('reports no speed or ETA until there are two samples', () => {
    const m = meterAt([0]);
    m.push(ev({ downloaded: 10 }));
    const s = m.snapshot();
    expect(s.speedBps).toBeNull();
    expect(s.etaSeconds).toBeNull();
    expect(s.pct).toBe(10);
  });

  it('computes speed from two samples and derives an ETA', () => {
    const m = meterAt([0]);
    m.push(ev({ downloaded: 0, totalBytes: 100_000_000 }), 0);
    m.push(ev({ downloaded: 25_000_000, totalBytes: 100_000_000 }), 1000);
    const s = m.snapshot();
    // 25 MB in 1s.
    expect(s.speedBps).toBe(25_000_000);
    // 75 MB left at 25 MB/s.
    expect(s.etaSeconds).toBe(3);
    expect(s.pct).toBe(25);
  });

  it('ignores zero/negative progress when computing speed', () => {
    const m = meterAt([0, 1000]);
    m.push(ev({ downloaded: 0 }), 0);
    m.push(ev({ downloaded: 0 }), 1000);
    expect(m.snapshot().speedBps).toBeNull();
  });

  it('omits total and ETA when totalBytes is unknown', () => {
    const m = meterAt([0, 1000]);
    m.push(ev({ downloaded: 0, totalBytes: 0, total: 0 }), 0);
    m.push(ev({ downloaded: 5_000_000, totalBytes: 0, total: 0 }), 1000);
    const s = m.snapshot();
    expect(s.totalBytes).toBe(0);
    expect(s.pct).toBeNull();
    expect(s.etaSeconds).toBeNull();
    // Speed still known.
    expect(s.speedBps).toBe(5_000_000);
  });

  it('caps percent at 100', () => {
    const m = meterAt([0, 1000]);
    m.push(ev({ downloaded: 0 }), 0);
    m.push(ev({ downloaded: 120, totalBytes: 100 }), 1000);
    expect(m.snapshot().pct).toBe(100);
  });

  it('reset clears history so a new download starts fresh', () => {
    const m = meterAt([0, 1000]);
    m.push(ev({ downloaded: 0 }), 0);
    m.push(ev({ downloaded: 10 }), 1000);
    m.reset();
    expect(m.snapshot().speedBps).toBeNull();
    expect(m.snapshot().downloaded).toBe(0);
  });

  it('names the stage for piper events', () => {
    const m = meterAt([0]);
    m.push(ev({ stage: 'voices', file: 'en_US-amy-low.onnx', downloaded: 1 }));
    expect(m.snapshot().label).toBe('en_US-amy-low');
  });
});

describe('formatSpeed', () => {
  it('scales B/s, KB/s, MB/s', () => {
    expect(formatSpeed(500)).toBe('500B/s');
    expect(formatSpeed(1500)).toBe('2KB/s');
    expect(formatSpeed(2_500_000)).toBe('2.5MB/s');
  });
});

describe('formatEta', () => {
  it('formats seconds, minutes, hours', () => {
    expect(formatEta(45)).toBe('45s');
    expect(formatEta(90)).toBe('1m 30s');
    expect(formatEta(125)).toBe('2m 5s');
    expect(formatEta(3720)).toBe('1h 2m');
  });

  it('returns empty for non-finite input', () => {
    expect(formatEta(Infinity)).toBe('');
    expect(formatEta(NaN)).toBe('');
  });
});