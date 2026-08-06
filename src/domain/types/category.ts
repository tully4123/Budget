import type { Id } from "./common";

export type CategoryKind = "need" | "want" | "savings";

/** One of the 10 category color slots defined in tokens.css
 * (--color-cat-1 .. --color-cat-10). */
export type CategoryColorToken =
  | "cat-1"
  | "cat-2"
  | "cat-3"
  | "cat-4"
  | "cat-5"
  | "cat-6"
  | "cat-7"
  | "cat-8"
  | "cat-9"
  | "cat-10";

/** Key into the app's icon set (src/ui/components/icons.tsx or a later,
 * larger set) - kept as a plain string so the icon set can grow without
 * touching this type. */
export type IconKey = string;

export interface Category {
  id: Id;
  name: string;
  iconKey: IconKey;
  colorToken: CategoryColorToken;
  kind: CategoryKind;
  isArchived: boolean;
  /** True only for the one system Savings category that goalContribution
   * transactions are filed under - lets code find it reliably rather than
   * matching on name (which the user could rename). Not user-creatable. */
  isSystem?: boolean;
}
