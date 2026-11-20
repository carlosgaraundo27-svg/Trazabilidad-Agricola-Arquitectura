export function evaluateLoad(report, frames, cpuCount) {
  const metrics = report.summary.metrics;
  const requests = metrics.http_reqs?.values.count ?? 0;
  const countRate = (name) =>
    metrics[name]?.values.passes ??
    Math.round((metrics[name]?.values.rate ?? 0) * requests);
  const result = {
    requests,
    throughput: metrics.http_reqs?.values.rate ?? null,
    p95CorrectMs: metrics.qr_success_ms?.values["p(95)"] ?? null,
    limited429: countRate("qr_429"),
    server5xx: countRate("qr_5xx"),
    correctRate: metrics.qr_correct?.values.rate ?? 0,
  };
  const generator = frames.flatMap((frame) =>
    frame.containers.filter((c) => c.name === "sprint02-k6"),
  );
  let stopReason = null;
  if (!requests || !frames.length || !generator.length)
    stopReason = "insufficient_measurement";
  else if (result.server5xx) stopReason = "server_5xx";
  else if (result.limited429) stopReason = "rate_limit_429";
  else if (result.correctRate !== 1)
    stopReason = "incorrect_or_transport_response";
  else if (
    frames.some(
      (f) =>
        f.hostCpuPercent > 70 ||
        f.availableMemoryBytes < f.totalMemoryBytes * 0.2,
    ) ||
    generator.some((g) => g.cpuPercent / cpuCount > 70 || g.memoryPercent > 80)
  )
    stopReason = "resource_limit";
  return { ...result, canAdvance: stopReason === null, stopReason };
}
