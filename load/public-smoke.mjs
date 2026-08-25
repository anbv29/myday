import { performance } from 'node:perf_hooks';

const baseUrl = (process.env.LOAD_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const durationSeconds = Math.max(5, Math.min(300, Number(process.env.LOAD_DURATION_SECONDS ?? 20)));
const concurrency = Math.max(1, Math.min(100, Number(process.env.LOAD_CONCURRENCY ?? 10)));
const productionHost = !/localhost|127\.0\.0\.1/.test(baseUrl);

if (productionHost && process.env.LOAD_TEST_ALLOW_PRODUCTION !== 'true') {
  throw new Error('Refusing to load-test a non-local host. Set LOAD_TEST_ALLOW_PRODUCTION=true only with explicit authorization.');
}

const routes = ['/', '/leaderboard', '/explore', '/trending', '/search?q=launch', '/health'];
const deadline = performance.now() + durationSeconds * 1000;
const latencies = [];
let requests = 0;
let failures = 0;

async function worker(workerId) {
  let index = workerId;
  while (performance.now() < deadline) {
    const route = routes[index % routes.length];
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}${route}`, { headers: { 'User-Agent': 'myday-authorized-load-smoke/1.0' } });
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch {
      failures += 1;
    }
    latencies.push(performance.now() - started);
    requests += 1;
    index += concurrency;
  }
}

await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index)));
latencies.sort((a, b) => a - b);
const percentile = (value) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * value))] ?? 0;
const result = {
  baseUrl,
  durationSeconds,
  concurrency,
  requests,
  failures,
  errorRate: requests ? Number((failures / requests).toFixed(4)) : 1,
  requestsPerSecond: Number((requests / durationSeconds).toFixed(2)),
  p50Ms: Number(percentile(0.5).toFixed(1)),
  p95Ms: Number(percentile(0.95).toFixed(1)),
  p99Ms: Number(percentile(0.99).toFixed(1)),
};
console.log(JSON.stringify(result, null, 2));
if (result.errorRate > 0.01) process.exitCode = 1;
