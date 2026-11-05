"use client";

import { useEffect, useState } from "react";

interface AgentStatusProps {
  status: string;
  lastSeen: string | null;
}

export function AgentStatus({ status, lastSeen }: AgentStatusProps) {
  const [stale, setStale] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStale(
      !lastSeen || Date.now() - new Date(lastSeen).getTime() > 60_000
    );
  }, [lastSeen]);

  if (!mounted) {
    return (
      <span className="text-xs mt-2 inline-block px-2 py-0. rounded bg-gray-100 text-gray-500">
        {status}
      </span>
    );
  }

  return (
    <span
      className={`text-xs mt-2 inline-block px-2 py-0.5 rounded ${
        status === "active" && !stale
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {status}
      {stale ? " · stale" : ""}
    </span>
  );
}