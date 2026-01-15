import { useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../services/db';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  table: string;
  event?: PostgresChangeEvent;
  filter?: string;
  schema?: string;
}

interface UseRealtimeSubscriptionOptions {
  /** Unique channel name for this subscription */
  channelName: string;
  /** Table configurations to subscribe to */
  subscriptions: SubscriptionConfig[];
  /** Callback when any change occurs */
  onDataChange: () => void;
  /** Whether the subscription is enabled */
  enabled?: boolean;
  /** Debounce time in ms to batch rapid changes */
  debounceMs?: number;
}

/**
 * Universal hook for Supabase Realtime subscriptions
 * Provides automatic cleanup and debounced updates for better performance
 */
export function useRealtimeSubscription({
  channelName,
  subscriptions,
  onDataChange,
  enabled = true,
  debounceMs = 100
}: UseRealtimeSubscriptionOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onDataChange);
  const subscriptionsKey = useMemo(() => JSON.stringify(subscriptions), [subscriptions]);
  
  // Keep callback ref updated
  callbackRef.current = onDataChange;

  // Debounced change handler to batch rapid updates
  const handleChange = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current();
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    if (!supabase || !enabled || subscriptions.length === 0) {
      return;
    }

    // Create channel
    let channel = supabase.channel(channelName);

    // Add subscriptions for each table
    subscriptions.forEach((config) => {
      const { table, event = '*', filter, schema = 'public' } = config;
      
      // Use type assertion to handle Supabase's generic channel type
      channel = channel.on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {})
        },
        handleChange
      );
    });

    // Subscribe to channel
    channel.subscribe();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [channelName, subscriptionsKey, enabled, handleChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}

/**
 * Hook specifically for admin real-time updates
 * Subscribes to multiple tables commonly needed in admin views
 */
export function useAdminRealtimeUpdates(
  onDataChange: () => void,
  enabled: boolean = true
) {
  useRealtimeSubscription({
    channelName: 'admin-realtime-updates',
    subscriptions: [
      { table: 'registrations', event: '*' },
      { table: 'profiles', event: '*' },
      { table: 'courses', event: '*' },
      { table: 'course_completions', event: '*' },
      { table: 'course_sessions', event: '*' },
      { table: 'course_categories', event: '*' },
      { table: 'calendar_events', event: '*' }
    ],
    onDataChange,
    enabled,
    debounceMs: 150
  });
}

/**
 * Hook for user-specific realtime updates
 * Subscribes to changes related to the current user
 */
export function useUserRealtimeUpdates(
  userId: string | null,
  onDataChange: () => void,
  enabled: boolean = true
) {
  const subscriptions: SubscriptionConfig[] = userId ? [
    { table: 'registrations', event: '*', filter: `user_id=eq.${userId}` },
    { table: 'profiles', event: '*', filter: `id=eq.${userId}` },
    { table: 'course_completions', event: '*', filter: `user_id=eq.${userId}` }
  ] : [];

  useRealtimeSubscription({
    channelName: `user-updates-${userId || 'none'}`,
    subscriptions,
    onDataChange,
    enabled: enabled && !!userId,
    debounceMs: 100
  });
}

/**
 * Hook for course-specific realtime updates
 */
export function useCourseRealtimeUpdates(
  courseId: string | null,
  onDataChange: () => void,
  enabled: boolean = true
) {
  const subscriptions: SubscriptionConfig[] = courseId ? [
    { table: 'registrations', event: '*', filter: `course_id=eq.${courseId}` },
    { table: 'course_sessions', event: '*', filter: `course_id=eq.${courseId}` },
    { table: 'course_completions', event: '*', filter: `course_id=eq.${courseId}` }
  ] : [];

  useRealtimeSubscription({
    channelName: `course-updates-${courseId || 'none'}`,
    subscriptions,
    onDataChange,
    enabled: enabled && !!courseId,
    debounceMs: 100
  });
}

/**
 * Hook for calendar and events realtime updates
 */
export function useCalendarRealtimeUpdates(
  onDataChange: () => void,
  enabled: boolean = true
) {
  useRealtimeSubscription({
    channelName: 'calendar-realtime-updates',
    subscriptions: [
      { table: 'calendar_events', event: '*' },
      { table: 'courses', event: 'UPDATE' } // Course dates might change
    ],
    onDataChange,
    enabled,
    debounceMs: 200
  });
}

/**
 * Hook for categories realtime updates
 */
export function useCategoriesRealtimeUpdates(
  onDataChange: () => void,
  enabled: boolean = true
) {
  useRealtimeSubscription({
    channelName: 'categories-realtime-updates',
    subscriptions: [
      { table: 'course_categories', event: '*' }
    ],
    onDataChange,
    enabled,
    debounceMs: 150
  });
}

export default useRealtimeSubscription;
