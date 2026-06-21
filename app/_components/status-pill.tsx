interface StatusPillProps {
  isOnline: boolean | null;
  latency: number | null;
  hasMonitorKey: boolean;
  monitorDataLoaded: boolean;
  monitorMatched: boolean;
}

export function StatusPill({
  isOnline,
  latency,
  hasMonitorKey,
  monitorDataLoaded,
  monitorMatched,
}: StatusPillProps) {
  const label = getStatusLabel({
    hasMonitorKey,
    isOnline,
    monitorDataLoaded,
    monitorMatched,
  });
  const isMissingMonitorData =
    hasMonitorKey && monitorDataLoaded && !monitorMatched;

  return (
    <div className="flex items-center gap-2 border border-[var(--line)] bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs text-[var(--ink)] shadow-[3px_3px_0_rgba(31,37,35,0.18)]">
      <span className="relative flex h-3 w-3">
        {isOnline ? (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--green)]" />
          </>
        ) : isOnline === false ? (
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--red)]" />
        ) : !hasMonitorKey ? (
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--muted)]" />
        ) : isMissingMonitorData ? (
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--amber)]" />
        ) : (
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--muted)]" />
        )}
      </span>
      <span>{label}</span>
      {isOnline && latency !== null ? (
        <span className="border-l border-[var(--line)] pl-2 font-mono text-xs text-[var(--muted)]">
          {latency}ms
        </span>
      ) : null}
    </div>
  );
}

function getStatusLabel({
  hasMonitorKey,
  isOnline,
  monitorDataLoaded,
  monitorMatched,
}: Pick<
  StatusPillProps,
  "hasMonitorKey" | "isOnline" | "monitorDataLoaded" | "monitorMatched"
>) {
  if (!hasMonitorKey) {
    return "状态未接入";
  }

  if (isOnline === true) {
    return "运行中";
  }

  if (isOnline === false) {
    return "已离线";
  }

  if (monitorDataLoaded && !monitorMatched) {
    return "状态未知";
  }

  return "检测中";
}
