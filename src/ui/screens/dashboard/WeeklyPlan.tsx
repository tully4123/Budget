import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ALLOCATION_BUCKETS,
  ALLOCATION_LABELS,
  allocationAmounts,
  overAllocatedPercent,
  setBucketPercent,
  unallocatedPercent,
  type AllocationBucket,
} from "../../../domain/allocation/allocation";
import { computeWeeklyIncome } from "../../../domain/planner/freeCashFlow";
import { cents, formatCents, type Cents } from "../../../domain/money";
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

  const leftoverPercent = unallocatedPercent(weeklyAllocation);
  const overPercent = overAllocatedPercent(weeklyAllocation);

  const chartData = ALLOCATION_BUCKETS.map((bucket) => ({
    name: ALLOCATION_LABELS[bucket],
    value: weeklyAllocation[bucket],
    color: resolveToken(BUCKET_COLOR_TOKEN[bucket]),
  }));
  // Fill the rest of the ring with a neutral "unallocated" slice so each
  // real slice's angle always means "this many percent of a full week" -
  // once the plan goes over 100%, there's no room left to show that way,
  // so the summary line below takes over instead.
  if (leftoverPercent > 0) {
    chartData.push({ name: "Unallocated", value: leftoverPercent, color: resolveToken("border") });
  }

  function handleChangePercent(bucket: AllocationBucket, percent: number) {
    setWeeklyAllocation(setBucketPercent(weeklyAllocation, bucket, percent));
  }

  /** Typing a dollar amount converts to a percent of weekly income first -
   * the allocation model is always percentage-based underneath, so a $
   * edit is really "set the percent that produces this many dollars." Only
   * that one bucket changes - the others are untouched. */
  function handleChangeAmount(bucket: AllocationBucket, amountCents: Cents) {
    if (!hasIncome) return;
    const percent = Math.round((amountCents / weeklyIncomeCents) * 100);
    setWeeklyAllocation(setBucketPercent(weeklyAllocation, bucket, percent));
  }

  return (
    <div className={styles.card}>
      <p className={styles.body}>
        How you want to split each week's money. Drag a slider, or type a percent or a dollar
        amount - each category is independent, so feel free to leave money unassigned or go over.
      </p>
      {overPercent > 0 ? (
        <p className={`${styles.summaryLine} ${styles.summaryWarning}`}>
          {overPercent}% more than a full week
          {hasIncome
            ? ` - about ${formatCents(cents(Math.round((weeklyIncomeCents * overPercent) / 100)), currency)} over what you bring in`
            : ""}
          .
        </p>
      ) : leftoverPercent > 0 ? (
        <p className={styles.summaryLine}>
          {leftoverPercent}% of the week isn't assigned yet
          {hasIncome
            ? ` - about ${formatCents(cents(Math.round((weeklyIncomeCents * leftoverPercent) / 100)), currency)} left`
            : ""}
          .
        </p>
      ) : (
        <p className={`${styles.summaryLine} ${styles.summaryPositive}`}>Fully allocated.</p>
      )}
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
