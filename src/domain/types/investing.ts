import type { Cents } from "../money";
import type { Id } from "./common";

/**
 * Investing stubs - types only, no logic, no UI beyond the Investing
 * screen's "coming soon" placeholder. A future phase adds real portfolio
 * tracking and goal-linked investing.
 */
export interface Holding {
  id: Id;
  symbol: string;
  quantity: number;
  costBasisCents: Cents;
}

export interface Portfolio {
  id: Id;
  name: string;
  goalId?: Id;
  holdings: Holding[];
}
