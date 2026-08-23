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

function mapRealtimeOrder(row: any) {
  return {
    id: row.id,
    orderNumber: row.order_number || row.orderNumber || '',
    customerId: row.customer_id || undefined,
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    customerEmail: row.customer_email || undefined,
    deliveryLocation: { county: row.county || '', town: row.town || '', estate: row.estate || '', landmark: row.landmark || '', instructions: row.instructions || '' },
    deliveryZoneId: row.delivery_zone_id || '',
    deliveryZoneName: row.delivery_zone_name || '',
    deliveryFee: Number(row.delivery_fee || 0),
    subtotal: Number(row.subtotal || 0),
    total: Number(row.total || 0),
    paymentMethod: row.payment_method || 'CASH_ON_DELIVERY',
    paymentStatus: row.payment_status || 'PENDING',
    status: row.status || 'ORDER_RECEIVED',
    statusHistory: row.status_history || [],
    items: [],
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  };
}

export function useRealtime(options: UseRealtimeOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const channelNameRef = useRef(`megacity-realtime-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (isSupabaseConfigured) {
      const channelName = channelNameRef.current;
      const channel = supabase
        .channel(channelName)
        .on('broadcast', { event: 'order:created' }, ({ payload }) => optionsRef.current.onOrderCreated?.(payload))
        .on('broadcast', { event: 'order:status_updated' }, ({ payload }) => optionsRef.current.onOrderStatusUpdated?.(payload))
        .on('broadcast', { event: 'product:updated' }, ({ payload }) => optionsRef.current.onProductUpdated?.(payload))
        .on('broadcast', { event: 'inventory:updated' }, ({ payload }) => optionsRef.current.onInventoryUpdated?.(payload))
        .on('broadcast', { event: 'notification:created' }, ({ payload }) => optionsRef.current.onNotificationCreated?.(payload))
        .on('broadcast', { event: 'settings:updated' }, ({ payload }) => optionsRef.current.onSettingsUpdated?.(payload))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => optionsRef.current.onOrderCreated?.(mapRealtimeOrder(payload.new)))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
          const updated = payload.new as any;
          optionsRef.current.onOrderStatusUpdated?.({ orderId: updated.id, orderNumber: updated.order_number || updated.orderNumber, status: updated.status || updated.order_status, history: updated.status_history || updated.statusHistory || [] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
          optionsRef.current.onProductUpdated?.(payload.new);
          optionsRef.current.onInventoryUpdated?.(payload.new);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => optionsRef.current.onNotificationCreated?.(payload.new))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'business_settings' }, (payload) => optionsRef.current.onSettingsUpdated?.(payload.new));

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log(`[Supabase Realtime] Connected successfully to ${channelName}`);
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') console.warn('[Supabase Realtime] Channel status:', status);
      });

      return () => { void supabase.removeChannel(channel); };
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    function connect() {
      try {
        eventSource?.close();
        eventSource = new EventSource('/api/events');
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const { event: evtType, payload } = data;
            if (evtType === 'order:created') optionsRef.current.onOrderCreated?.(payload);
            else if (evtType === 'order:status_updated') optionsRef.current.onOrderStatusUpdated?.(payload);
            else if (evtType === 'product:updated') optionsRef.current.onProductUpdated?.(payload);
            else if (evtType === 'inventory:updated') optionsRef.current.onInventoryUpdated?.(payload);
            else if (evtType === 'notification:created') optionsRef.current.onNotificationCreated?.(payload);
            else if (evtType === 'settings:updated') optionsRef.current.onSettingsUpdated?.(payload);
          } catch {}
        };
        eventSource.onerror = () => { eventSource?.close(); eventSource = null; if (reconnectTimeout) clearTimeout(reconnectTimeout); reconnectTimeout = setTimeout(connect, 3000); };
      } catch { if (reconnectTimeout) clearTimeout(reconnectTimeout); reconnectTimeout = setTimeout(connect, 4000); }
    }
    connect();
    return () => { if (reconnectTimeout) clearTimeout(reconnectTimeout); eventSource?.close(); };
  }, []);
}
