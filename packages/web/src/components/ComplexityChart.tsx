'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCenturyShort } from '@seshat/shared';
import type { ProjectionPoint, ConfidenceBand } from '@seshat/shared';

interface ComplexityChartProps {
  baseline: ProjectionPoint[];
  counterfactual?: ProjectionPoint[];
  confidenceBands?: ConfidenceBand[];
  animated?: boolean;
}

export function ComplexityChart({
  baseline,
  counterfactual,
  confidenceBands,
  animated = true,
}: ComplexityChartProps) {
  // Merge all data by century for Recharts
  const data = baseline.map((b, i) => {
    const cf = counterfactual?.[i];
    const band = confidenceBands?.[i];
    return {
      century: b.century,
      centuryLabel: formatCenturyShort(b.century),
      baseline: round(b.pc1_composite),
      counterfactual: cf ? round(cf.pc1_composite) : undefined,
      bandLow: band ? round(band.p5) : undefined,
      bandHigh: band ? round(band.p95) : undefined,
      band25: band ? round(band.p25) : undefined,
      band75: band ? round(band.p75) : undefined,
    };
  });

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis
            dataKey="centuryLabel"
            tick={{ fontSize: 12, fill: '#78716c' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#78716c' }}
            tickLine={false}
            label={{
              value: 'Social complexity index',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#78716c' },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #d6d3d1',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            formatter={(value: number, name: string) => [
              value.toFixed(2),
              name === 'baseline'
                ? 'Historical'
                : name === 'counterfactual'
                  ? 'Counterfactual'
                  : name,
            ]}
            labelFormatter={(label) => `Century: ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: '13px' }}
            formatter={(value) =>
              value === 'baseline'
                ? 'Historical'
                : value === 'counterfactual'
                  ? 'Counterfactual'
                  : value
            }
          />

          {/* Confidence band (p5–p95) */}
          {confidenceBands && (
            <Area
              dataKey="bandHigh"
              stroke="none"
              fill="#2563eb"
              fillOpacity={0.08}
              isAnimationActive={animated}
              name="95% confidence"
              legendType="none"
            />
          )}
          {confidenceBands && (
            <Area
              dataKey="bandLow"
              stroke="none"
              fill="#fff"
              fillOpacity={1}
              isAnimationActive={false}
              legendType="none"
            />
          )}

          {/* Inner band (p25–p75) */}
          {confidenceBands && (
            <Area
              dataKey="band75"
              stroke="none"
              fill="#2563eb"
              fillOpacity={0.12}
              isAnimationActive={animated}
              name="50% confidence"
              legendType="none"
            />
          )}
          {confidenceBands && (
            <Area
              dataKey="band25"
              stroke="none"
              fill="#fff"
              fillOpacity={1}
              isAnimationActive={false}
              legendType="none"
            />
          )}

          {/* Baseline line */}
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="#374151"
            strokeWidth={2}
            dot={false}
            isAnimationActive={animated}
            animationDuration={1500}
          />

          {/* Counterfactual line */}
          {counterfactual && (
            <Line
              type="monotone"
              dataKey="counterfactual"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              isAnimationActive={animated}
              animationDuration={2000}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
