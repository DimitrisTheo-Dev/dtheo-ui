'use client';

import { FrequencyChart } from '@dtheo/charts';
import { bode } from '@/lib/lab-data';

const m = bode.margins;
const fmt = (v: number, d = 0) => v.toFixed(d);

export default function FrequencyChartExample() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col">
        <span className="text-headline">Open-loop response</span>
        <span className="text-caption text-muted-foreground">
          RA-14 hip pitch · R-0412 against the R-0409 reference
        </span>
      </div>
      <FrequencyChart
        frequency={bode.frequency}
        magnitude={[
          { id: 'ref', label: 'R-0409', values: bode.reference.magnitude, tone: 'muted', width: 1.5 },
          { id: 'cur', label: 'R-0412', values: bode.current.magnitude },
        ]}
        phase={[
          { id: 'ref', label: 'R-0409', values: bode.reference.phase, tone: 'muted', width: 1.5 },
          { id: 'cur', label: 'R-0412', values: bode.current.phase },
        ]}
        magnitudeDomain={[-80, 30]}
        magnitudeTicks={[-60, -40, -20, 0, 20]}
        phaseDomain={[-315, -45]}
        phaseTicks={[-270, -180, -90]}
        references={{ magnitude: [0], phase: [-180] }}
        markers={[{ frequency: m.gainCrossover, label: `Crossover ${fmt(m.gainCrossover, 1)} Hz` }]}
        spans={[
          {
            pane: 'phase',
            frequency: m.gainCrossover,
            from: -180,
            to: m.phaseAtCrossover,
            label: `Phase margin ${fmt(m.phaseMargin)}°`,
          },
          {
            pane: 'magnitude',
            frequency: m.phaseCrossover,
            from: m.magnitudeAtPhaseCrossover,
            to: 0,
            label: `Gain margin ${fmt(m.gainMargin)} dB`,
          },
        ]}
        paneHeight={170}
        ariaLabel={`Bode plot. R-0412 crosses 0 dB at ${fmt(m.gainCrossover, 1)} Hz with a ${fmt(m.phaseMargin)}° phase margin, down from ${fmt(bode.referenceMargins.phaseMargin)}° on R-0409. Gain margin is ${fmt(m.gainMargin)} dB.`}
      />
    </div>
  );
}
