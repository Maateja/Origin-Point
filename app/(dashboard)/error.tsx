"use client";
import { useEffect } from "react";
import { DataState } from "@/components/platform/primitives";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary caught:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <DataState
        loading={false}
        error={
          error?.message ||
          "An unexpected error interrupted this page. Your saved records are still in your account."
        }
        retry={reset}
      />
      {error?.stack && (
        <pre className="mt-4 p-4 rounded-xl bg-muted/60 text-xs font-mono overflow-auto max-h-64 text-destructive border border-destructive/20 whitespace-pre-wrap">
          {error.stack}
        </pre>
      )}
    </main>
  );
}
