export type NavItem = { href: string; label: string };
export const mainNavigation: readonly NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/trips/new-orleans-example", label: "Example trip" },
  { href: "/about", label: "About" },
];
