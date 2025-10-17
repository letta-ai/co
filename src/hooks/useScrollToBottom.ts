import { useRef, useEffect, useCallback } from 'react';
import { FlatList } from 'react-native';

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
   * Whether to animate the scroll
   * @default true
   */
  animated?: boolean;
}

/**
 * Hook for managing scroll-to-bottom behavior in chat interfaces
 *
 * @example
 * const { scrollViewRef, scrollToBottom, onContentSizeChange } = useScrollToBottom({
 *   scrollOnMount: true,
 *   delay: 100
 * });
 *
 * <FlatList
 *   ref={scrollViewRef}
 *   onContentSizeChange={onContentSizeChange}
 * />
 */
export function useScrollToBottom(options: UseScrollToBottomOptions = {}) {
  const {
    scrollOnMount = true,
    delay = 100,
    animated = true,
  } = options;

  const scrollViewRef = useRef<FlatList<any>>(null);
  const hasMountedRef = useRef(false);
  const contentSizeRef = useRef({ width: 0, height: 0 });

  const scrollToBottom = useCallback((customAnimated?: boolean) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({
        animated: customAnimated !== undefined ? customAnimated : animated
      });
    }, delay);
  }, [delay, animated]);

  // Handle content size change - scroll to bottom if content grows
  const onContentSizeChange = useCallback((width: number, height: number) => {
    const hasContentGrown = height > contentSizeRef.current.height;
    contentSizeRef.current = { width, height };

    // Scroll if this is the first render with content, or if content has grown
    if (!hasMountedRef.current && height > 0 && scrollOnMount) {
      hasMountedRef.current = true;
      scrollToBottom(false); // Don't animate initial scroll
    } else if (hasContentGrown && hasMountedRef.current) {
      // Content grew after mount - could be new message
      scrollToBottom(true);
    }
  }, [scrollOnMount, scrollToBottom]);

  // Scroll on mount if requested
  useEffect(() => {
    if (scrollOnMount) {
      scrollToBottom(false);
    }
  }, [scrollOnMount, scrollToBottom]);

  return {
    scrollViewRef,
    scrollToBottom,
    onContentSizeChange,
  };
}
