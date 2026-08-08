import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ALLOCATION_BUCKETS,
  ALLOCATION_LABELS,
  allocationPercents,
  amountForPercent,
  overAllocatedCents,
  setBucketAmount,
  totalAllocatedCents,
  unallocatedCents,
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

  const totalCents = totalAllocatedCents(weeklyAllocation);
  const leftoverCents = unallocatedCents(weeklyAllocation, weeklyIncomeCents);
  const overCents = overAllocatedCents(weeklyAllocation, weeklyIncomeCents);
  const overPercent = hasIncome ? Math.round((overCents / weeklyIncomeCents) * 100) : 0;
  const leftoverPercent = hasIncome ? Math.round((leftoverCents / weeklyIncomeCents) * 100) : 0;
  const percents = hasIncome ? allocationPercents(weeklyAllocation, weeklyIncomeCents) : null;

  const chartData = ALLOCATION_BUCKETS.filter((b) => weeklyAllocation[b] > 0).map((bucket) => ({
    name: ALLOCATION_LABELS[bucket],
    value: weeklyAllocation[bucket],
    color: resolveToken(BUCKET_COLOR_TOKEN[bucket]),
  }));
  // Fill the rest of the ring with a neutral "unallocated" slice, when we
  // know what a full week looks like, so each real slice's size always
  // means "this many dollars of my week" rather than a relative share.
  if (hasIncome && leftoverCents > 0) {
    chartData.push({ name: "Unallocated", value: leftoverCents, color: resolveToken("border") });
  }
  const hasChartData = chartData.length > 0;

  function handleChangeAmount(bucket: AllocationBucket, amountCents: Cents) {
    setWeeklyAllocation(setBucketAmount(weeklyAllocation, bucket, amountCents));
  }

  /** Typing a percent converts to a dollar amount first - the allocation
   * model is always amount-based underneath, so a % edit is really "set
   * the amount that's this percent of my weekly income." Only meaningful
   * once income is known; only that one bucket changes. */
  function handleChangePercent(bucket: AllocationBucket, percent: number) {
    if (!hasIncome) return;
    setWeeklyAllocation(setBucketAmount(weeklyAllocation, bucket, amountForPercent(percent, weeklyIncomeCents)));
  }

  return (
    <div className={styles.card}>
      <p className={styles.body}>
        How much of each week's money goes to each category. Type a dollar amount directly -
        {hasIncome ? " drag, or type a percent - " : " "}
        each category is independent, so don't worry about hitting an exact total.
      </p>
      {hasIncome ? (
        overCents > 0 ? (
          <p className={`${styles.summaryLine} ${styles.summaryWarning}`}>
            {formatCents(overCents, currency)} more than a full week ({overPercent}% over).
          </p>
        ) : leftoverCents > 0 ? (
          <p className={styles.summaryLine}>
            {formatCents(leftoverCents, currency)} of the week isn't assigned yet ({leftoverPercent}% left).
          </p>
        ) : (
          <p className={`${styles.summaryLine} ${styles.summaryPositive}`}>Fully allocated.</p>
        )
      ) : totalCents > 0 ? (
        <p className={styles.summaryLine}>{formatCents(totalCents, currency)} planned per week so far.</p>
      ) : null}
      <div className={styles.layout}>
        <div className={styles.chartWrap}>
          {hasChartData ? (
            <>
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
                  <Tooltip formatter={(value, name) => [formatCents(cents(Number(value)), currency), name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.chartCenter}>
                <div className={styles.chartCenterLabel}>Planned/week</div>
                <div className={styles.chartCenterValue}>{formatCents(totalCents, currency)}</div>
              </div>
            </>
          ) : (
            <p className={styles.chartEmpty}>Add an amount below to see your split.</p>
          )}
        </div>

        <div className={styles.sliders}>
          {ALLOCATION_BUCKETS.map((bucket) => (
            <AllocationRow
              key={bucket}
              bucket={bucket}
              label={ALLOCATION_LABELS[bucket]}
              colorToken={BUCKET_COLOR_TOKEN[bucket]}
              amountCents={weeklyAllocation[bucket]}
              percent={percents ? percents[bucket] : null}
              sliderMaxCents={hasIncome ? weeklyIncomeCents : null}
              currency={currency}
              onChangeAmount={handleChangeAmount}
              onChangePercent={handleChangePercent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
