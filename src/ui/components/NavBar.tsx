import type { ReactElement } from "react";
import { NavLink } from "react-router-dom";
import {
  FlagIcon,
  HomeIcon,
  ListIcon,
  SettingsIcon,
  StarIcon,
  TrendingUpIcon,
  WalletIcon,
} from "./icons";
import styles from "./NavBar.module.css";

interface NavItem {
  to: string;
  label: string;
  icon: (props: { className?: string }) => ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: HomeIcon },
  { to: "/transactions", label: "Activity", icon: ListIcon },
  { to: "/budgets", label: "Budgets", icon: WalletIcon },
  { to: "/goals", label: "Goals", icon: FlagIcon },
  { to: "/rewards", label: "Rewards", icon: StarIcon },
  { to: "/investing", label: "Invest", icon: TrendingUpIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function NavBar() {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.list}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className={styles.item}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.linkActive}` : styles.link
              }
            >
              <Icon className={styles.icon} />
              <span className={styles.label}>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
