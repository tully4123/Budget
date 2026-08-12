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

export function CartIcon(props: IconProps) {
  return base(
    <>
      <path d="M3 4h2l2.4 12.1a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="9.5" cy="20.5" r="1" />
      <circle cx="17.5" cy="20.5" r="1" />
    </>,
    props,
  );
}

export function CarIcon(props: IconProps) {
  return base(
    <>
      <path d="M3 15.5 4.6 9a2 2 0 0 1 1.9-1.4h11a2 2 0 0 1 1.9 1.4l1.6 6.5" />
      <rect x="2.5" y="15.5" width="19" height="4.5" rx="1.5" />
      <circle cx="7" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </>,
    props,
  );
}

export function UtensilsIcon(props: IconProps) {
  return base(
    <>
      <path d="M6 2v8a2 2 0 0 0 4 0V2" />
      <path d="M8 10v12" />
      <path d="M17 2c-1.7 0-3 2-3 5s1.3 5 3 5v10" />
    </>,
    props,
  );
}

export function FilmIcon(props: IconProps) {
  return base(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M8 4v5" />
      <path d="M8 15v5" />
    </>,
    props,
  );
}

export function RepeatIcon(props: IconProps) {
  return base(
    <>
      <path d="M4 7h13l-2.5-2.5" />
      <path d="M20 17H7l2.5 2.5" />
    </>,
    props,
  );
}

export function HeartIcon(props: IconProps) {
  return base(
    <path d="M12 20.5s-7.5-4.6-9.8-9C.7 8.1 2.3 4.5 5.8 4a4.6 4.6 0 0 1 6.2 2 4.6 4.6 0 0 1 6.2-2c3.5.5 5.1 4.1 3.6 7.5-2.3 4.4-9.8 9-9.8 9Z" />,
    props,
  );
}

export function BoxIcon(props: IconProps) {
  return base(
    <>
      <path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 7.5v9L12 21l9-4.5v-9" />
      <path d="M12 12v9" />
    </>,
    props,
  );
}

export function ZapIcon(props: IconProps) {
  return base(<path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" />, props);
}

export function ShieldIcon(props: IconProps) {
  return base(
    <>
      <path d="M12 3.5 19 6.5v5c0 5-3 8.5-7 9.5-4-1-7-4.5-7-9.5v-5l7-3Z" />
      <path d="m9.2 12 1.9 1.9 3.7-3.9" />
    </>,
    props,
  );
}

export function BagIcon(props: IconProps) {
  return base(
    <>
      <path d="M6 8h12l1 12.5a1 1 0 0 1-1 1.5H6a1 1 0 0 1-1-1.5L6 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>,
    props,
  );
}

export function SparkleIcon(props: IconProps) {
  return base(
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13.6 12l3.5 1.6-3.5 1.6L12 18.7l-1.6-3.5L7 13.6l3.5-1.6L12 8.5Z" />
    </>,
    props,
  );
}

export function PlaneIcon(props: IconProps) {
  return base(
    <path d="M10.5 20.5 12 15l-6.5-1L3 15.5l1.5-4L3 8.5l2.5 1L12 8l-1.5-5.5L13 2l3 6.5 5-1v3l-5 1.7L13 20l-2.5.5Z" />,
    props,
  );
}

export function BookIcon(props: IconProps) {
  return base(
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" />
    </>,
    props,
  );
}

export function GiftIcon(props: IconProps) {
  return base(
    <>
      <rect x="3.5" y="9" width="17" height="4" rx="0.6" />
      <path d="M5 13v8h14v-8M12 9v12" />
      <path d="M12 9c-1.2 0-4-.4-4-2.8A2.2 2.2 0 0 1 10.2 4C12 4 12 7 12 9Z" />
      <path d="M12 9c1.2 0 4-.4 4-2.8A2.2 2.2 0 0 0 13.8 4C12 4 12 7 12 9Z" />
    </>,
    props,
  );
}

export function PawIcon(props: IconProps) {
  return base(
    <>
      <ellipse cx="12" cy="16.2" rx="4.6" ry="3.6" />
      <ellipse cx="6" cy="10.5" rx="1.7" ry="2.2" />
      <ellipse cx="10.2" cy="7" rx="1.7" ry="2.2" />
      <ellipse cx="13.8" cy="7" rx="1.7" ry="2.2" />
      <ellipse cx="18" cy="10.5" rx="1.7" ry="2.2" />
    </>,
    props,
  );
}

export function TrashIcon(props: IconProps) {
  return base(
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" />
      <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7" />
    </>,
    props,
  );
}

export function PencilIcon(props: IconProps) {
  return base(
    <>
      <path d="M4 20.5h4L19.5 9a2 2 0 0 0 0-2.8l-1.7-1.7a2 2 0 0 0-2.8 0L4 15.5v5Z" />
      <path d="M14 5.5 18.5 10" />
    </>,
    props,
  );
}

export function XIcon(props: IconProps) {
  return base(
    <>
      <path d="M5 5l14 14" />
      <path d="M19 5 5 19" />
    </>,
    props,
  );
}

export function CheckIcon(props: IconProps) {
  return base(<path d="m4 12.5 5.5 5.5L20 6" />, props);
}

export function ChevronLeftIcon(props: IconProps) {
  return base(<path d="M15 5 8 12l7 7" />, props);
}

export function ChevronRightIcon(props: IconProps) {
  return base(<path d="m9 5 7 7-7 7" />, props);
}

export function TrophyIcon(props: IconProps) {
  return base(
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a3 3 0 0 0 3 4.2" />
      <path d="M17 5h3a3 3 0 0 1-3 4.2" />
      <path d="M12 14v3" />
      <path d="M8.5 20.5h7" />
      <path d="M9.5 17.5h5l.5 3h-6l.5-3Z" />
    </>,
    props,
  );
}

export function BuddyIcon(props: IconProps) {
  return base(
    <>
      <path d="M12 2.5v2" />
      <circle cx="12" cy="12.5" r="8.5" />
      <circle cx="9" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <path d="M8.5 15c1 1.1 2.2 1.6 3.5 1.6s2.5-.5 3.5-1.6" />
    </>,
    props,
  );
}
