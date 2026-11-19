'use client';

import { FrequencyChart } from '@dtheo/charts';
import { spectrum } from '@/lib/lab-data';

export default function FrequencyChartSpectrumExample() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col">
        <span className="text-headline">Vibration spectrum</span>
        <span className="text-caption text-muted-foreground">
          Output-flange accelerometer · R-0412 · 2 s capture
        </span>
      </div>
      <FrequencyChart
        frequency={spectrum.frequency}
        magnitude={[{ id: 'acc', label: 'Acceleration', values: spectrum.magnitude }]}
        magnitudeDomain={[-90, -10]}
        magnitudeTicks={[-80, -60, -40, -20]}
        magnitudeUnit="dB re 1 g"
        peaks={spectrum.peaks.filter((p) => p.value > -46)}
        paneHeight={220}
        ariaLabel="Vibration spectrum from 5 Hz to 1 kHz. The largest peak is the gearbox resonance at 182 Hz, near −22 dB; its harmonic at 364 Hz and motor cogging at 96 Hz sit about 20 dB lower."
      />
    </div>
  );
}
