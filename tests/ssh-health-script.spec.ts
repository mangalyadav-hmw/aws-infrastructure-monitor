import { describe, expect, it } from 'vitest';
import { parseSshHealthOutput } from '@/services/ssh/ssh-health-script';

describe('parseSshHealthOutput', () => {
  it('parses read-only health script output', () => {
    const raw = [
      'ip-172-31-9-87.ap-south-1.compute.internal',
      'up 2 days, 3 hours',
      'Ubuntu 24.04.3 LTS',
      '12.5',
      '41.2',
      '63',
    ].join('\n');

    expect(parseSshHealthOutput(raw)).toEqual({
      hostname: 'ip-172-31-9-87.ap-south-1.compute.internal',
      uptime: 'up 2 days, 3 hours',
      operatingSystem: 'Ubuntu 24.04.3 LTS',
      cpuUsagePercent: 12.5,
      memoryUsagePercent: 41.2,
      diskUsagePercent: 63,
    });
  });

  it('throws when output is incomplete', () => {
    expect(() => parseSshHealthOutput('only-one-line')).toThrow(
      'SSH health script returned incomplete data',
    );
  });
});
