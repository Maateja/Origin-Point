"use client";
import { useState } from "react";
import { documentUrl } from "@/lib/platform-store";
export function DocumentLink({ path }: { path: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function openDocument() {
    const tab = window.open("about:blank", "_blank");
    if (!tab) {
      setError("Allow pop-ups to open this document.");
      return;
    }
    tab.opener = null;
    setBusy(true);
    setError("");
    try {
      const url = await documentUrl(path);
      tab.location.replace(url);
    } catch (error) {
      tab.close();
      setError(
        error instanceof Error ? error.message : "Could not open the document.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={openDocument}
        className="text-left text-xs font-semibold role-text"
      >
        {busy ? "Preparing secure link…" : "Open attached document ↗"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
