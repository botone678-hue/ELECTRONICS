import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

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
    // 1. If Supabase Realtime is enabled
    if (isSupabaseConfigured) {
      const channel = supabase.channel('megacity-realtime');

      // Listen for Broadcast events
      channel
        .on('broadcast', { event: 'order:created' }, ({ payload }) => {
          optionsRef.current.onOrderCreated?.(payload);
        })
        .on('broadcast', { event: 'order:status_updated' }, ({ payload }) => {
          optionsRef.current.onOrderStatusUpdated?.(payload);
        })
        .on('broadcast', { event: 'product:updated' }, ({ payload }) => {
          optionsRef.current.onProductUpdated?.(payload);
        })
        .on('broadcast', { event: 'inventory:updated' }, ({ payload }) => {
          optionsRef.current.onInventoryUpdated?.(payload);
        })
        .on('broadcast', { event: 'notification:created' }, ({ payload }) => {
          optionsRef.current.onNotificationCreated?.(payload);
        })
        .on('broadcast', { event: 'settings:updated' }, ({ payload }) => {
          optionsRef.current.onSettingsUpdated?.(payload);
        })
        // Also listen for direct Postgres Changes
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => {
            optionsRef.current.onOrderCreated?.(payload.new);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          (payload) => {
            const updated = payload.new as any;
            optionsRef.current.onOrderStatusUpdated?.({
              orderId: updated.id,
              orderNumber: updated.order_number || updated.orderNumber,
              status: updated.status,
              history: updated.status_history || updated.statusHistory || []
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            optionsRef.current.onProductUpdated?.(payload.new);
            optionsRef.current.onInventoryUpdated?.(payload.new);
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            optionsRef.current.onNotificationCreated?.(payload.new);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'business_settings' },
          (payload) => {
            optionsRef.current.onSettingsUpdated?.(payload.new);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Supabase Realtime] Connected successfully to megacity-realtime channel');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }

    // 2. Realtime SSE Fallback for local container dev
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
          } catch {
            // Heartbeat
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimeout = setTimeout(connect, 4000);
        };
      } catch (e) {
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
