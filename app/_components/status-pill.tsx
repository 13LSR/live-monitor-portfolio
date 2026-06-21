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
    <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1.5 text-sm text-slate-100 shadow-lg backdrop-blur-md">
      <span className="relative flex h-3 w-3">
        {isOnline ? (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
          </>
        ) : isOnline === false ? (
          <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
        ) : !hasMonitorKey ? (
          <span className="relative inline-flex h-3 w-3 rounded-full bg-slate-500" />
        ) : isMissingMonitorData ? (
          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
        ) : (
          <span className="relative inline-flex h-3 w-3 rounded-full bg-slate-500" />
        )}
      </span>
      <span>{label}</span>
      {isOnline && latency !== null ? (
        <span className="border-l border-white/15 pl-2 text-xs text-slate-300">
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
