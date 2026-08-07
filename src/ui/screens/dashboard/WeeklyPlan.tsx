import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ALLOCATION_BUCKETS,
  ALLOCATION_LABELS,
  adjustAllocation,
  allocationAmounts,
  type AllocationBucket,
} from "../../../domain/allocation/allocation";
import { computeWeeklyIncome } from "../../../domain/planner/freeCashFlow";
import { formatCents, type Cents } from "../../../domain/money";
import { useAppStore } from "../../../store/appStore";
import { AllocationRow } from "./AllocationRow";
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
  const hasIncome = weeklyIncomeCents > 0;
  const amounts = allocationAmounts(weeklyAllocation, weeklyIncomeCents);

  const chartData = ALLOCATION_BUCKETS.map((bucket) => ({
    name: ALLOCATION_LABELS[bucket],
    value: weeklyAllocation[bucket],
    color: resolveToken(BUCKET_COLOR_TOKEN[bucket]),
  }));

  function handleChangePercent(bucket: AllocationBucket, percent: number) {
    setWeeklyAllocation(adjustAllocation(weeklyAllocation, bucket, percent));
  }

  /** Typing a dollar amount converts to a percent of weekly income first -
   * the allocation model is always percentage-based underneath, so a $
   * edit is really "set the percent that produces this many dollars." */
  function handleChangeAmount(bucket: AllocationBucket, amountCents: Cents) {
    if (!hasIncome) return;
    const percent = Math.round((amountCents / weeklyIncomeCents) * 100);
    setWeeklyAllocation(adjustAllocation(weeklyAllocation, bucket, percent));
  }

  return (
    <div className={styles.card}>
      <p className={styles.body}>
        How you want to split each week's money. Drag a slider, or type a percent or a dollar
        amount directly - the others adjust to keep the total at 100%.
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
            <div className={styles.chartCenterValue}>{hasIncome ? formatCents(weeklyIncomeCents, currency) : "—"}</div>
          </div>
        </div>

        <div className={styles.sliders}>
          {ALLOCATION_BUCKETS.map((bucket) => (
            <AllocationRow
              key={bucket}
              bucket={bucket}
              label={ALLOCATION_LABELS[bucket]}
              colorToken={BUCKET_COLOR_TOKEN[bucket]}
              percent={weeklyAllocation[bucket]}
              amountCents={hasIncome ? amounts[bucket] : null}
              currency={currency}
              onChangePercent={handleChangePercent}
              onChangeAmount={handleChangeAmount}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
