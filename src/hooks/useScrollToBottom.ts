import { useRef, useEffect, useCallback, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

interface UseScrollToBottomOptions {
  /**
   * Whether to scroll to bottom on initial mount/load
   * @default true
   */
  scrollOnMount?: boolean;

  /**
   * Delay before scrolling (ms) - useful for rendering completion
   * @default 100
   */
  delay?: number;

  /**
   * Distance from bottom (px) to consider "at bottom"
   * @default 100
   */
  threshold?: number;
}

/**
 * Hook for managing scroll-to-bottom behavior in chat interfaces
 *
 * ULTRATHINK SIMPLE SOLUTION:
 * - Tracks if user is at bottom
 * - Only auto-scrolls if user is at bottom
 * - Prevents scroll jumps on content replace
 * - Allows manual scroll up without interference
 *
 * @example
 * const { scrollViewRef, scrollToBottom, onContentSizeChange, onScroll } = useScrollToBottom();
 *
 * <FlatList
 *   ref={scrollViewRef}
 *   onContentSizeChange={onContentSizeChange}
 *   onScroll={onScroll}
 * />
 */
export function useScrollToBottom(options: UseScrollToBottomOptions = {}) {
  const {
    scrollOnMount = true,
    delay = 100,
    threshold = 100,
  } = options;

  const scrollViewRef = useRef<FlatList<any>>(null);
  const hasMountedRef = useRef(false);
  const isNearBottomRef = useRef(true); // Assume at bottom initially
  const contentSizeRef = useRef({ width: 0, height: 0 });
  const layoutHeightRef = useRef(0);

  // Track scroll position to determine if user is at bottom
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    // Calculate distance from bottom
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);

    // Update near-bottom state
    isNearBottomRef.current = distanceFromBottom <= threshold;

    // Store layout height for later use
    layoutHeightRef.current = layoutMeasurement.height;
  }, [threshold]);

  // Scroll to bottom - but only if user is already near bottom
  const scrollToBottom = useCallback((force: boolean = false) => {
    if (force || isNearBottomRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, delay);
    }
  }, [delay]);

  // Handle content size change - scroll if user is at bottom
  const onContentSizeChange = useCallback((width: number, height: number) => {
    const prevHeight = contentSizeRef.current.height;
    contentSizeRef.current = { width, height };

    // Initial mount - always scroll to bottom
    if (!hasMountedRef.current && height > 0) {
      hasMountedRef.current = true;
      if (scrollOnMount) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, delay);
      }
      return;
    }

    // Content grew (new messages) - only scroll if user was at bottom
    if (height > prevHeight && isNearBottomRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, delay);
    }
  }, [scrollOnMount, delay]);

  return {
    scrollViewRef,
    scrollToBottom,
    onContentSizeChange,
    onScroll,
  };
}
