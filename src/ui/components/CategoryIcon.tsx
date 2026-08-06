import type { ReactElement, SVGProps } from "react";
import {
  BoxIcon,
  CarIcon,
  CartIcon,
  FilmIcon,
  FlagIcon,
  HeartIcon,
  HomeIcon,
  RepeatIcon,
  TrendingUpIcon,
  UtensilsIcon,
} from "./icons";

const REGISTRY: Record<string, (props: SVGProps<SVGSVGElement>) => ReactElement> = {
  home: HomeIcon,
  cart: CartIcon,
  car: CarIcon,
  utensils: UtensilsIcon,
  film: FilmIcon,
  repeat: RepeatIcon,
  heart: HeartIcon,
  box: BoxIcon,
  flag: FlagIcon,
  "trending-up": TrendingUpIcon,
};

interface CategoryIconProps extends SVGProps<SVGSVGElement> {
  iconKey: string;
}

export function CategoryIcon({ iconKey, ...props }: CategoryIconProps) {
  const Icon = REGISTRY[iconKey] ?? BoxIcon;
  return <Icon {...props} />;
}
