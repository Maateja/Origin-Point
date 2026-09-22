"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Settings, X } from "lucide-react";
import { roleNavigation } from "./sidebar";
import { cn } from "@/lib/utils";
export function MobileBottomNav({ role = "student" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = [
    ...(roleNavigation[role] || roleNavigation.student),
    {
      label: "Profile & credentials",
      href: `/${role}/profile`,
      icon: Settings,
    },
  ];
  useEffect(() => setOpen(false), [pathname]);
  return (
    <nav
      aria-label="Mobile workspace navigation"
      className="mobile-glass-nav fixed z-50 md:hidden"
    >
      {open && (
        <div
          id="mobile-workspace-menu"
          className="max-h-[65vh] overflow-auto border-b border-border p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Your workspace</p>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-xl p-3 text-xs",
                  pathname === item.href
                    ? "role-bg-soft role-text"
                    : "bg-muted/40 text-muted-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="flex h-16 items-center justify-around">
        {items.slice(0, 3).map((item) => (
          <Link
            href={item.href}
            key={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px]",
              pathname === item.href ? "role-text" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
        <button
          aria-expanded={open}
          aria-controls="mobile-workspace-menu"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] role-text"
        >
          <Menu className="h-5 w-5" />
          All pages
        </button>
      </div>
    </nav>
  );
}
