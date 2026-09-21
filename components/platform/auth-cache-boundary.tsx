"use client";
import { useAuthCacheBoundary } from "@/lib/platform-store";
export function AuthCacheBoundary({ children }: { children: React.ReactNode }) {
  useAuthCacheBoundary();
  return children;
}
