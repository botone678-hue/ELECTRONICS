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

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.warn('[Supabase Realtime] Supabase is not configured; realtime is disabled rather than using an unauthenticated SSE fallback.');
      return;
    }

    // Production realtime uses Postgres Changes only. Do not use unrestricted
    // broadcast payloads for records that may contain customer/order PII.
    const channel = supabase
      .channel('megacity-postgres-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        optionsRef.current.onOrderCreated?.(mapRealtimeOrder(payload.new));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as any;
        optionsRef.current.onOrderStatusUpdated?.({
          orderId: updated.id,
          orderNumber: updated.order_number || updated.orderNumber,
          status: updated.status || updated.order_status,
          history: updated.status_history || updated.statusHistory || []
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        optionsRef.current.onProductUpdated?.(payload.new);
        optionsRef.current.onInventoryUpdated?.(payload.new);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        optionsRef.current.onNotificationCreated?.(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'business_settings' }, (payload) => {
        optionsRef.current.onSettingsUpdated?.(payload.new);
      });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('[Supabase Realtime] Connected using Postgres Changes');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn('[Supabase Realtime] Channel status:', status);
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
}
