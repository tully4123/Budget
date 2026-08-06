/**
 * Minimal inline icon set for nav + misc UI. Deliberately plain (stroke-based
 * geometry, currentColor) - visual polish is Claude Design's job later; these
 * exist so the nav and screens aren't icon-less in the meantime.
 */
import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(children: ReactNode, props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return base(
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </>,
    props,
  );
}

export function ListIcon(props: IconProps) {
  return base(
    <>
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </>,
    props,
  );
}

export function WalletIcon(props: IconProps) {
  return base(
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 14.5h2" />
    </>,
    props,
  );
}

export function FlagIcon(props: IconProps) {
  return base(
    <>
      <path d="M5 3v18" />
      <path d="M5 4h11l-2.5 4L16 12H5" />
    </>,
    props,
  );
}

export function StarIcon(props: IconProps) {
  return base(
    <path d="m12 3 2.6 5.8 6.2.6-4.7 4.2 1.4 6.1L12 16.9 6.5 19.7l1.4-6.1L3.2 9.4l6.2-.6Z" />,
    props,
  );
}

export function TrendingUpIcon(props: IconProps) {
  return base(
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 6h6v6" />
    </>,
    props,
  );
}

export function SettingsIcon(props: IconProps) {
  return base(
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.6a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.4a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 6.05 8.4a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5A1.7 1.7 0 0 0 11.5 2.4V4.4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.11a1.7 1.7 0 0 0 1.56 1.04H19.6a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" />
    </>,
    props,
  );
}

export function PlusIcon(props: IconProps) {
  return base(
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>,
    props,
  );
}

export function FlameIcon(props: IconProps) {
  return base(
    <path d="M12 2.5c.9 2.2-1.9 3.7-2.6 6-1 3.1 1.1 5 2.6 5 2.2 0 4-1.6 4-4 0-1.2-.5-2-1-2.7.6 1.7-.4 2.7-1.1 2.7-.9 0-1.4-.8-1-1.8.6-1.5-.2-3.5-1.9-5.2Zm0 19c-4.4 0-7.5-2.9-7.5-6.8 0-2.4 1.1-4.2 2.2-5.6-.2 2 .6 3.1 1.6 3.1.9 0 1.4-.8 1-1.7C8.6 8.6 9.7 6.6 12 5c-.3 2.6 2.8 3.9 2.8 7 0 .9-.2 1.6-.5 2.2 1-.6 1.7-1.7 1.7-3.1 0-.5-.1-1-.2-1.4 1.1 1.3 2.2 3.2 2.2 5.6 0 3.9-3.1 6.8-7.5 6.8Z" />,
    props,
  );
}
