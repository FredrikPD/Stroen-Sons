export type NavItem = {
  href: string;
  label: string;
  icon: string; // material-symbols name
  adminOnly?: boolean;
};

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Hjem", icon: "home" },
  { href: "/posts", label: "Innlegg", icon: "news" },
  { href: "/events", label: "Arrangementer", icon: "calendar_month" },
  { href: "/gallery", label: "Bildearkiv", icon: "photo_library" },
  { href: "/members", label: "Medlemmer", icon: "group" },
  { href: "/about", label: "Om klubben", icon: "info" },
];

export const ACCOUNT_NAV: NavItem[] = [
  { href: "/balance", label: "Saldo", icon: "account_balance" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Admin Dashboard", icon: "admin_panel_settings", adminOnly: true },
];