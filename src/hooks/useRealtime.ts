import { useEffect, useRef } from 'react';

interface UseRealtimeOptions {
  onOrderCreated?: (order: any) => void;
  onOrderStatusUpdated?: (data: { orderId: string; orderNumber: string; status: string; history: any[] }) => void;
  onProductUpdated?: (product: any) => void;
  onInventoryUpdated?: (data: any) => void;
  onNotificationCreated?: (notif: any) => void;
  onSettingsUpdated?: (settings: any) => void;
}

export function useRealtime(options: UseRealtimeOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const { event: evtType, payload } = data;

            if (evtType === 'order:created' && optionsRef.current.onOrderCreated) {
              optionsRef.current.onOrderCreated(payload);
            } else if (evtType === 'order:status_updated' && optionsRef.current.onOrderStatusUpdated) {
              optionsRef.current.onOrderStatusUpdated(payload);
            } else if (evtType === 'product:updated' && optionsRef.current.onProductUpdated) {
              optionsRef.current.onProductUpdated(payload);
            } else if (evtType === 'inventory:updated' && optionsRef.current.onInventoryUpdated) {
              optionsRef.current.onInventoryUpdated(payload);
            } else if (evtType === 'notification:created' && optionsRef.current.onNotificationCreated) {
              optionsRef.current.onNotificationCreated(payload);
            } else if (evtType === 'settings:updated' && optionsRef.current.onSettingsUpdated) {
              optionsRef.current.onSettingsUpdated(payload);
            }
          } catch (e) {
            // Non-JSON or heartbeat
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect after 4s
          reconnectTimeout = setTimeout(connect, 4000);
        };
      } catch (e) {
        console.warn('Realtime SSE connection failed, retrying in 5s', e);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
    };
  }, []);
}
