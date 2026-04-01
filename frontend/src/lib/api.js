// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Root service info endpoint.
 */
export async function getServiceInfo() {
  try {
    const response = await fetch(API_BASE_URL.replace(/\/api$/, '/'));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Failed to fetch service info:', error);
    return null;
  }
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch events from the live FastAPI backend
 * @param {number} limit - Maximum number of events to fetch (default: 10, max: 50)
 * @returns {Promise<Array>} List of events
 */
export async function getEvents(limit = 10) {
  try {
    const data = await apiGet(`/events?limit=${Math.min(limit, 50)}`);
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

// Alias for backward compatibility
export function fetchEvents(limit = 10) {
  return getEvents(limit);
}

/**
 * Fetch a specific event by ID from the backend
 * @param {string} eventId - Event ID to fetch
 * @returns {Promise<Object>} Event object
 */
export async function fetchEvent(eventId) {
  try {
    const data = await apiGet(`/events/${eventId}`);
    return data.data || data;
  } catch (error) {
    console.error(`Failed to fetch event ${eventId}:`, error);
    throw error;
  }
}

/**
 * Fetch detailed reasoning chain explanation for XAI visualization
 * @param {string} eventId - Event ID to fetch explanation for
 * @returns {Promise<Object>} Reasoning chain data with all analysis steps
 */
export async function fetchEventExplanation(eventId) {
  try {
    const data = await apiGet(`/events/${eventId}/explain`);
    return data.data || data;
  } catch (error) {
    console.error(`Failed to fetch explanation for event ${eventId}:`, error);
    throw error;
  }
}

/**
 * Fetch validations from the backend
 * @param {number} limit - Maximum number of validations to fetch (default: 20, max: 100)
 * @returns {Promise<Array>} List of validations
 */
export async function getValidations(limit = 20) {
  try {
    const data = await apiGet(`/validations?limit=${Math.min(limit, 100)}`);
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error('Failed to fetch validations:', error);
    return [];
  }
}

// Alias for backward compatibility
export function fetchValidations(limit = 20) {
  return getValidations(limit);
}

/**
 * Validate a specific event
 * @param {string} eventId - Event ID to validate
 * @param {string} horizon - Time horizon ('1h', '6h', '24h')
 * @returns {Promise<Object>} Validation result
 */
export async function validateEvent(eventId, horizon = '24h') {
  try {
    const data = await apiGet(`/validate/${eventId}?horizon=${horizon}`);
    return data.data || data;
  } catch (error) {
    console.error(`Failed to validate event ${eventId}:`, error);
    throw error;
  }
}

/**
 * Analyze a headline and persist event.
 */
export async function analyzeNews({ headline, text = '', source = 'Frontend' }) {
  try {
    const data = await apiPost('/analyze', {
      headline,
      text,
      source,
      timestamp: new Date().toISOString(),
    });
    return data.data || null;
  } catch (error) {
    console.error('Failed to analyze news:', error);
    throw error;
  }
}

/**
 * Simulate a scenario without persisting
 */
export async function simulateScenario(scenarioText) {
  try {
    const data = await apiPost('/simulate', { scenario: scenarioText });
    return data.data || null;
  } catch (error) {
    console.error('Failed to simulate scenario:', error);
    return null;
  }
}

/**
 * Fetch price data for a specific ticker
 * @param {string} ticker - Stock ticker
 * @param {string} priceRange - Time range ('1h', '1d', '1w', '1m')
 * @returns {Promise<Object>} Price data with historical points
 */
export async function fetchPrice(ticker, priceRange = '1d') {
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await apiGet(
        `/price?ticker=${encodeURIComponent(ticker)}&price_range=${encodeURIComponent(priceRange)}`,
      );
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  console.error(`Failed to fetch price for ${ticker} after retry:`, lastError);
  throw lastError;
}

/**
 * Backend API health.
 */
export async function getHealth() {
  try {
    return await apiGet('/health');
  } catch (error) {
    console.error('Failed to fetch backend health:', error);
    return null;
  }
}

/**
 * Local LLM runtime health.
 */
export async function getLlmHealth() {
  try {
    const data = await apiGet('/llm/health');
    return data.data || null;
  } catch (error) {
    console.error('Failed to fetch LLM health:', error);
    return null;
  }
}

/**
 * Connect to WebSocket for real-time events
 * @returns {WebSocket} Connected WebSocket instance
 */
export function connectWebSocket() {
  const ws = new WebSocket(`${WS_BASE}/ws/events`);
  
  ws.onopen = () => {
    console.log('✅ WebSocket connected');
  };
  
  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('⚠️ WebSocket disconnected');
  };
  
  return ws;
}

// Backward compatibility stubs for old code
export function getMockEvents() {
  console.warn('getMockEvents is deprecated, use getEvents() instead');
  return [];
}

export function getMockValidations() {
  console.warn('getMockValidations is deprecated, use getValidations() instead');
  return [];
}
