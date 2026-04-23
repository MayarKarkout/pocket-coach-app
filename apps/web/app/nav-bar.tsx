"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dumbbell, ClipboardList, UtensilsCrossed } from "lucide-react";

const NAV = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/log", label: "Log", icon: ClipboardList },
  { href: "/food", label: "Food", icon: UtensilsCrossed },
];

export function NavBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background flex z-10">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 ${
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
