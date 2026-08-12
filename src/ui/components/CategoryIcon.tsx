import type { ReactElement, SVGProps } from "react";
import {
  BagIcon,
  BookIcon,
  BoxIcon,
  CarIcon,
  CartIcon,
  FilmIcon,
  FlagIcon,
  GiftIcon,
  HeartIcon,
  HomeIcon,
  PawIcon,
  PlaneIcon,
  RepeatIcon,
  ShieldIcon,
  SparkleIcon,
  TrendingUpIcon,
  UtensilsIcon,
  ZapIcon,
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
  zap: ZapIcon,
  shield: ShieldIcon,
  bag: BagIcon,
  sparkle: SparkleIcon,
  plane: PlaneIcon,
  book: BookIcon,
  gift: GiftIcon,
  paw: PawIcon,
};

interface CategoryIconProps extends SVGProps<SVGSVGElement> {
  iconKey: string;
}

export function CategoryIcon({ iconKey, ...props }: CategoryIconProps) {
  const Icon = REGISTRY[iconKey] ?? BoxIcon;
  return <Icon {...props} />;
}
