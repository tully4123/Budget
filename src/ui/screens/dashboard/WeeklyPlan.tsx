import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ALLOCATION_BUCKETS,
  ALLOCATION_LABELS,
  adjustAllocation,
  allocationAmounts,
  type AllocationBucket,
} from "../../../domain/allocation/allocation";
import { computeWeeklyIncome } from "../../../domain/planner/freeCashFlow";
import { formatCents } from "../../../domain/money";
import { useAppStore } from "../../../store/appStore";
import styles from "./WeeklyPlan.module.css";

const BUCKET_COLOR_TOKEN: Record<AllocationBucket, string> = {
  rent: "cat-1",
  investments: "cat-5",
  savings: "cat-2",
  spending: "cat-3",
  repayments: "cat-4",
};

/** Reads a --color-cat-N custom property's resolved value so Recharts
 * (which needs real color strings, not CSS var() references, for canvas/
 * SVG fills) stays in sync with the token file instead of hard-coding hex
 * values here. */
function resolveToken(token: string): string {
  if (typeof window === "undefined") return "#888";
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${token}`).trim() || "#888";
}

export function WeeklyPlan() {
  const profile = useAppStore((s) => s.profile);
  const incomeSources = useAppStore((s) => s.incomeSources);
  const weeklyAllocation = useAppStore((s) => s.weeklyAllocation);
  const setWeeklyAllocation = useAppStore((s) => s.setWeeklyAllocation);

  const currency = profile?.currency ?? "USD";
  const weeklyIncomeCents = computeWeeklyIncome(incomeSources);
  const amounts = allocationAmounts(weeklyAllocation, weeklyIncomeCents);

  const chartData = ALLOCATION_BUCKETS.map((bucket) => ({
    name: ALLOCATION_LABELS[bucket],
    value: weeklyAllocation[bucket],
    color: resolveToken(BUCKET_COLOR_TOKEN[bucket]),
  }));

  function handleSlide(bucket: AllocationBucket, value: number) {
    setWeeklyAllocation(adjustAllocation(weeklyAllocation, bucket, value));
  }

  return (
    <div className={styles.card}>
      <p className={styles.body}>
        How you want to split each week's money. Drag a slider - the others adjust to keep the
        total at 100%.
      </p>
      <div className={styles.layout}>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={3}
                isAnimationActive
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value}%`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.chartCenter}>
            <div className={styles.chartCenterLabel}>Per week</div>
            <div className={styles.chartCenterValue}>
              {weeklyIncomeCents > 0 ? formatCents(weeklyIncomeCents, currency) : "—"}
            </div>
          </div>
        </div>

        <div className={styles.sliders}>
          {ALLOCATION_BUCKETS.map((bucket) => (
            <div key={bucket} className={styles.sliderRow}>
              <div className={styles.sliderHeader}>
                <span className={styles.sliderDot} style={{ background: `var(--color-${BUCKET_COLOR_TOKEN[bucket]})` }} />
                <span className={styles.sliderLabel}>{ALLOCATION_LABELS[bucket]}</span>
                {weeklyIncomeCents > 0 && (
                  <span className={styles.sliderAmount}>{formatCents(amounts[bucket], currency)}</span>
                )}
                <span className={styles.sliderPercent}>{weeklyAllocation[bucket]}%</span>
              </div>
              <input
                type="range"
                className={styles.slider}
                style={{ "--slider-color": `var(--color-${BUCKET_COLOR_TOKEN[bucket]})` } as React.CSSProperties}
                min={0}
                max={100}
                value={weeklyAllocation[bucket]}
                onChange={(e) => handleSlide(bucket, Number(e.target.value))}
                aria-label={`${ALLOCATION_LABELS[bucket]} percent of weekly spending`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
