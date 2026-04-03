import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  connectWebSocket,
  fetchEvent,
  fetchPrice,
  getEvents,
  getValidations,
} from '../lib/api';

function buildValidationRowsFromEvent(eventPayload) {
  if (!eventPayload || !Array.isArray(eventPayload.affected_assets)) {
    return [];
  }

  return eventPayload.affected_assets
    .filter((asset) => asset && asset.validation_status)
    .map((asset) => ({
      event_id: eventPayload.event_id,
      headline: eventPayload.headline || '',
      predicted_direction: asset.prediction || 'NEUTRAL',
      predicted_ticker: asset.ticker || '',
      predicted_confidence: asset.confidence ?? 0.5,
      predicted_move_percent: asset.predicted_move_percent ?? null,
      horizon: '1d',
      price_at_event: 0.0,
      price_at_validation: 0.0,
      actual_change_percent: asset.actual_move_24h ?? asset.actual_move_pct ?? 0,
      actual_move_24h: asset.actual_move_24h ?? asset.actual_move_pct ?? null,
      status: asset.validation_status,
      validated_at: asset.validated_at,
    }));
}

export function useGeoPulseData() {
  const [events, setEvents] = useState([]);
  const [validations, setValidations] = useState([]);
  const [activeEventId, setActiveEventId] = useState(null);
  const [priceDataByTicker, setPriceDataByTicker] = useState({});
  const [liveWsMessage, setLiveWsMessage] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  const {
    data: eventsData,
    error: eventsError,
    isLoading: eventsLoading,
    mutate: mutateEvents,
  } = useSWR('events-feed', () => getEvents(50), {
    revalidateOnFocus: false,
  });

  const {
    data: validationsData,
    error: validationsError,
    isLoading: validationsLoading,
    mutate: mutateValidations,
  } = useSWR('validations-feed', () => getValidations(100), {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (!Array.isArray(eventsData)) {
      return;
    }
    setEvents(eventsData);
    if (!activeEventId && eventsData.length > 0) {
      setActiveEventId(eventsData[0].event_id);
    }
  }, [eventsData, activeEventId]);

  useEffect(() => {
    if (Array.isArray(validationsData)) {
      setValidations(validationsData);
    }
  }, [validationsData]);

  const refreshAll = useCallback(async () => {
    await Promise.all([mutateEvents(), mutateValidations()]);
  }, [mutateEvents, mutateValidations]);

  const refreshSelectedEvent = useCallback(async () => {
    if (!activeEventId) {
      return;
    }
    try {
      const latest = await fetchEvent(activeEventId);
      setEvents((prev) => prev.map((evt) => (evt.event_id === activeEventId ? latest : evt)));
    } catch (error) {
      console.error(`Failed to refresh event ${activeEventId}:`, error);
    }
  }, [activeEventId]);

  useEffect(() => {
    refreshSelectedEvent();
  }, [refreshSelectedEvent]);

  const fetchPriceForTicker = useCallback(async (ticker) => {
    if (!ticker || priceDataByTicker[ticker]) {
      return priceDataByTicker[ticker] || null;
    }

    try {
      const prices = await fetchPrice(ticker, '1d');
      setPriceDataByTicker((prev) => ({ ...prev, [ticker]: prices }));
      return prices;
    } catch (error) {
      console.error(`Failed to load price data for ${ticker}:`, error);
      return null;
    }
  }, [priceDataByTicker]);

  useEffect(() => {
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;

    const connect = () => {
      try {
        ws = connectWebSocket();

        ws.onopen = () => {
          reconnectAttempts = 0;
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            setLiveWsMessage(message);

            if (message.type === 'new_event' && message.event) {
              setEvents((prevEvents) => {
                if (prevEvents.find((e) => e.event_id === message.event.event_id)) {
                  return prevEvents;
                }
                return [message.event, ...prevEvents];
              });

              const rows = buildValidationRowsFromEvent(message.event);
              if (rows.length > 0) {
                setValidations((prev) => {
                  const rest = prev.filter((v) => v.event_id !== message.event.event_id);
                  return [...rows, ...rest].slice(0, 100);
                });
              }
            } else if (message.type === 'validation_update' && message.event) {
              setEvents((prevEvents) => {
                const withoutCurrent = prevEvents.filter((e) => e.event_id !== message.event.event_id);
                return [message.event, ...withoutCurrent];
              });

              const rows = buildValidationRowsFromEvent(message.event);
              setValidations((prev) => {
                const rest = prev.filter((v) => v.event_id !== message.event.event_id);
                return [...rows, ...rest].slice(0, 100);
              });
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = () => {
          setWsConnected(false);
        };

        ws.onclose = () => {
          setWsConnected(false);
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts += 1;
            setTimeout(connect, reconnectDelay);
          }
        };
      } catch (error) {
        setWsConnected(false);
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const activeEvent = useMemo(
    () => events.find((e) => e.event_id === activeEventId) || null,
    [events, activeEventId],
  );

  return {
    events,
    validations,
    activeEvent,
    activeEventId,
    setActiveEventId,
    loading: eventsLoading || validationsLoading,
    error: eventsError || validationsError || null,
    refreshAll,
    fetchPriceForTicker,
    priceDataByTicker,
    liveWsMessage,
    wsConnected,
  };
}
