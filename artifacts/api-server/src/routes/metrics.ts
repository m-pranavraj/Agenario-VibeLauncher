import { Router } from "express";
import { metrics } from "../lib/metrics.js";
import os from "os";

const router = Router();

router.get("/metrics", (req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");

  let out = "";

  // 1. HTTP request counters
  out += "# HELP http_requests_total Total number of HTTP requests\n";
  out += "# TYPE http_requests_total counter\n";
  for (const [key, count] of Object.entries(metrics.httpRequestsTotal)) {
    const [method, status] = key.split("_");
    out += `http_requests_total{method="${method}",status="${status}"} ${count}\n`;
  }

  // 2. HTTP latency gauge (average of last 1000 requests)
  const durations = metrics.httpRequestDurationMs;
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  out += "# HELP http_request_duration_ms_avg Average HTTP request latency in milliseconds\n";
  out += "# TYPE http_request_duration_ms_avg gauge\n";
  out += `http_request_duration_ms_avg ${avgDuration.toFixed(2)}\n`;

  // 3. Scan pipeline metrics
  out += "# HELP scans_started_total Total security scans started\n";
  out += "# TYPE scans_started_total counter\n";
  out += `scans_started_total ${metrics.scansStarted}\n`;

  out += "# HELP scans_completed_total Total security scans successfully completed\n";
  out += "# TYPE scans_completed_total counter\n";
  out += `scans_completed_total ${metrics.scansCompleted}\n`;

  out += "# HELP scans_failed_total Total security scans that failed\n";
  out += "# TYPE scans_failed_total counter\n";
  out += `scans_failed_total ${metrics.scansFailed}\n`;

  // 4. System & Process metrics
  const memory = process.memoryUsage();
  out += "# HELP process_mem_heap_used_bytes Heap memory used in bytes\n";
  out += "# TYPE process_mem_heap_used_bytes gauge\n";
  out += `process_mem_heap_used_bytes ${memory.heapUsed}\n`;

  out += "# HELP process_mem_heap_total_bytes Total heap allocated in bytes\n";
  out += "# TYPE process_mem_heap_total_bytes gauge\n";
  out += `process_mem_heap_total_bytes ${memory.heapTotal}\n`;

  const cpu = process.cpuUsage();
  out += "# HELP process_cpu_user_seconds Total user CPU time in seconds\n";
  out += "# TYPE process_cpu_user_seconds counter\n";
  out += `process_cpu_user_seconds ${(cpu.user / 1e6).toFixed(4)}\n`;

  out += "# HELP process_cpu_system_seconds Total system CPU time in seconds\n";
  out += "# TYPE process_cpu_system_seconds counter\n";
  out += `process_cpu_system_seconds ${(cpu.system / 1e6).toFixed(4)}\n`;

  out += "# HELP system_load_average_1m 1-minute system load average\n";
  out += "# TYPE system_load_average_1m gauge\n";
  out += `system_load_average_1m ${os.loadavg()[0] || 0}\n`;

  res.send(out);
});

export default router;
