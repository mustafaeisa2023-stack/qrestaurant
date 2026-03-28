'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuthStore, useNotificationStore } from '@/stores';
import type { Order, OrderStatus } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

// ── دالة الصوت — مشتركة بين كلا الـ hooks ────────────────
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 880;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// ── Admin Socket ──────────────────────────────────────────

interface UseAdminSocketOptions {
  onNewOrder?: (order: Order) => void;
  onOrderStatusUpdated?: (order: Order) => void;
}

export function useAdminSocket(options: UseAdminSocketOptions = {}) {
  const socketRef    = useRef<Socket | null>(null);
  const accessToken  = useAuthStore((s) => s.accessToken);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    const { io } = await import('socket.io-client');

    socketRef.current = io(`${WS_URL}/orders`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 Admin WebSocket connected');
    });

    socket.on('disconnect', (reason: string) => {
      console.warn('🔌 WebSocket disconnected:', reason);
    });

    socket.on('order:new', ({ order }: { order: Order }) => {
      playNotificationSound();
      addNotification({
        type: 'ORDER_NEW',
        title: `New Order – Table ${order.table?.number}`,
        message: `Order #${order.orderNumber} with ${order.items?.length} item(s)`,
        data: { orderId: order.id },
      });
      options.onNewOrder?.(order);
    });

    socket.on('order:status-updated', ({ order }: { order: Order }) => {
      options.onOrderStatusUpdated?.(order);
    });

    socket.on('connect_error', (err: Error) => {
      console.error('WebSocket connection error:', err.message);
    });
  }, [accessToken, addNotification, options]);

  useEffect(() => {
    if (!accessToken) return;

    // إذا في socket موجود بدون token — افصله وأعد الاتصال
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    connect();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  return { socket: socketRef.current };
}

// ── Customer Socket ───────────────────────────────────────

export function useCustomerSocket(options: {
  orderId?: string;
  tableId?: string;
  onStatusChanged?: (data: any) => void;
}) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let socket: Socket;

    const connect = async () => {
      const { io } = await import('socket.io-client');

      socket = io(`${WS_URL}/orders`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      socket.on('connect', () => {
        if (options.tableId) socket.emit('subscribe:table', { tableId: options.tableId });
        if (options.orderId) socket.emit('subscribe:order', { orderId: options.orderId });
      });

      socket.on('order:status-changed', (data: any) => {
        options.onStatusChanged?.(data);
      });

      socketRef.current = socket;
    };

    connect();

    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [options.orderId, options.tableId]);

  return { socket: socketRef.current };
}