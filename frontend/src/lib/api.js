// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

/**
 * Fetch events from the live FastAPI backend
 * @param {number} limit - Maximum number of events to fetch (default: 10, max: 50)
 * @returns {Promise<Array>} List of events
 */
export async function getEvents(limit = 10) {
  try {
    const response = await fetch(`${API_BASE_URL}/events?limit=${Math.min(limit, 50)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
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
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error(`Failed to fetch event ${eventId}:`, error);
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
    const response = await fetch(`${API_BASE_URL}/validations?limit=${Math.min(limit, 100)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
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
    const response = await fetch(`${API_BASE_URL}/validate/${eventId}?horizon=${horizon}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error(`Failed to validate event ${eventId}:`, error);
    throw error;
  }
}

/**
 * Simulate a scenario without persisting
 */
export async function simulateScenario(scenarioText) {
  try {
    const response = await fetch(`${API_BASE_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: scenarioText }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Failed to simulate scenario:', error);
    return null;
  }
}

/**
 * Fetch price data for a specific ticker
 * @param {string} ticker - Stock ticker
 * @param {string} range - Time range ('1d', '5d', '1mo', etc.)
 * @returns {Promise<Object>} Price data with historical points
 */
export async function fetchPrice(ticker, range = '1d') {
  try {
    const response = await fetch(`${API_BASE_URL}/price?ticker=${ticker}&range=${range}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch price for ${ticker}:`, error);
    throw error;
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
