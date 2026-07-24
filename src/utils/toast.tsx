import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, TouchableOpacity, Animated } from 'react-native';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
  opacity: Animated.Value;
}

const MAX_VISIBLE = 3;
const SUCCESS_DURATION = 2500;

let nextId = 0;
let listeners: Array<(msg: ToastMessage) => void> = [];
let queue: ToastMessage[] = [];

export function showToast(text: string, type: 'success' | 'error' = 'success') {
  const msg: ToastMessage = { id: nextId++, text, type, opacity: new Animated.Value(0) };
  listeners.forEach(fn => fn(msg));
}

function ToastItem({ item, onDismiss }: { item: ToastMessage; onDismiss: (id: number) => void }) {
  return (
    <Animated.View
      style={{
        opacity: item.opacity,
        backgroundColor: item.type === 'error' ? '#5c1a1a' : '#1a3d1a',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: item.type === 'error' ? '#ff6b6b' : '#4cd964',
        marginBottom: 8,
      }}
    >
      <TouchableOpacity onPress={() => onDismiss(item.id)} activeOpacity={0.8}>
        <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>{item.text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastContainer() {
  const [visible, setVisible] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
    setVisible(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissWithAnimation = useCallback((id: number) => {
    setVisible(prev => {
      const toast = prev.find(t => t.id === id);
      if (!toast) return prev;
      Animated.timing(toast.opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => removeToast(id));
      return prev;
    });
  }, [removeToast]);

  const enqueueNext = useCallback(() => {
    if (queue.length === 0) return;
    setVisible(prev => {
      if (prev.length >= MAX_VISIBLE) return prev;
      const next = queue.shift()!;
      const updated = [...prev, next];
      Animated.timing(next.opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (next.type === 'success') {
        const timer = setTimeout(() => dismissWithAnimation(next.id), SUCCESS_DURATION);
        timers.current.set(next.id, timer);
      }
      return updated;
    });
  }, [dismissWithAnimation]);

  useEffect(() => {
    const listener = (msg: ToastMessage) => {
      setVisible(prev => {
        if (prev.length < MAX_VISIBLE) {
          Animated.timing(msg.opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          if (msg.type === 'success') {
            const timer = setTimeout(() => dismissWithAnimation(msg.id), SUCCESS_DURATION);
            timers.current.set(msg.id, timer);
          }
          return [...prev, msg];
        }
        queue.push(msg);
        return prev;
      });
    };
    listeners.push(listener);
    return () => { listeners = listeners.filter(fn => fn !== listener); };
  }, [dismissWithAnimation]);

  useEffect(() => {
    const checkQueue = setInterval(() => {
      setVisible(prev => {
        if (prev.length < MAX_VISIBLE && queue.length > 0) {
          const next = queue.shift()!;
          const updated = [...prev, next];
          Animated.timing(next.opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          if (next.type === 'success') {
            const timer = setTimeout(() => dismissWithAnimation(next.id), SUCCESS_DURATION);
            timers.current.set(next.id, timer);
          }
          return updated;
        }
        return prev;
      });
    }, 500);
    return () => clearInterval(checkQueue);
  }, [dismissWithAnimation]);

  useEffect(() => {
    return () => { timers.current.forEach(t => clearTimeout(t)); };
  }, []);

  if (visible.length === 0) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 120,
        left: 16,
        right: 16,
        zIndex: 9999,
      }}
    >
      {visible.map(item => (
        <ToastItem key={item.id} item={item} onDismiss={dismissWithAnimation} />
      ))}
    </Animated.View>
  );
}
