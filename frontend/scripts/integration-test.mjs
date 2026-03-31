const BASE_URL = process.env.GEOPULSE_API_URL || 'http://localhost:8000';

function logResult(name, ok, details) {
  const marker = ok ? 'PASS' : 'FAIL';
  console.log(`[${marker}] ${name}${details ? ` - ${details}` : ''}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { response, body };
}

async function run() {
  const checks = [];

  checks.push({
    name: 'GET /',
    run: async () => {
      const { response, body } = await request('/');
      return {
        ok: response.status === 200 && body?.status === 'running',
        details: `status=${response.status}`,
      };
    },
  });

  checks.push({
    name: 'GET /api/health',
    run: async () => {
      const { response, body } = await request('/api/health');
      return {
        ok: response.status === 200 && body?.status === 'healthy',
        details: `status=${response.status}`,
      };
    },
  });

  checks.push({
    name: 'GET /api/llm/health',
    run: async () => {
      const { response, body } = await request('/api/llm/health');
      return {
        ok: response.status === 200 && body?.status === 'success',
        details: `status=${response.status}`,
      };
    },
  });

  checks.push({
    name: 'GET /api/events?limit=5',
    run: async () => {
      const { response, body } = await request('/api/events?limit=5');
      return {
        ok: response.status === 200 && Array.isArray(body?.data),
        details: `status=${response.status}, events=${Array.isArray(body?.data) ? body.data.length : 'n/a'}`,
      };
    },
  });

  checks.push({
    name: 'GET /api/validations?limit=5',
    run: async () => {
      const { response, body } = await request('/api/validations?limit=5');
      return {
        ok: response.status === 200 && Array.isArray(body?.data),
        details: `status=${response.status}, validations=${Array.isArray(body?.data) ? body.data.length : 'n/a'}`,
      };
    },
  });

  checks.push({
    name: 'GET /api/price?ticker=AAPL&price_range=1d',
    run: async () => {
      const { response, body } = await request('/api/price?ticker=AAPL&price_range=1d');
      return {
        ok: response.status === 200 && Array.isArray(body?.prices) && body.prices.length > 0,
        details: `status=${response.status}, points=${Array.isArray(body?.prices) ? body.prices.length : 0}`,
      };
    },
  });

  checks.push({
    name: 'GET /api/price invalid range',
    run: async () => {
      const { response } = await request('/api/price?ticker=AAPL&price_range=2d');
      return {
        ok: response.status === 422,
        details: `status=${response.status}`,
      };
    },
  });

  checks.push({
    name: 'POST /api/simulate',
    run: async () => {
      const { response, body } = await request('/api/simulate', {
        method: 'POST',
        body: JSON.stringify({ scenario: 'OPEC extends production cuts into next quarter' }),
      });
      return {
        ok: response.status === 200 && body?.status === 'success',
        details: `status=${response.status}`,
      };
    },
  });

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    try {
      const result = await check.run();
      if (result.ok) {
        passed += 1;
      } else {
        failed += 1;
      }
      logResult(check.name, result.ok, result.details);
    } catch (error) {
      failed += 1;
      logResult(check.name, false, error?.message || 'Unexpected error');
    }
  }

  console.log('');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Total: ${checks.length}, Passed: ${passed}, Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
