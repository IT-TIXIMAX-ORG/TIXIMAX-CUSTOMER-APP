import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/src/theme/tokens';

export const TAB_BAR_BASE_HEIGHT = 56;
export const TAB_BAR_TOP_PADDING = spacing.sm;
export const TAB_BAR_MIN_BOTTOM_PADDING = spacing.sm;
export const TAB_SCREEN_BOTTOM_GUTTER = spacing['4xl'];

export const useSafeBottomPadding = () => {
  const { bottom } = useSafeAreaInsets();

  return Math.max(bottom, TAB_BAR_MIN_BOTTOM_PADDING);
};

export const useScreenContentTopPadding = (
  basePadding: number = 0,
  options?: { hasHeader?: boolean; includeTopInset?: boolean },
) => {
  const { top } = useSafeAreaInsets();

  if (options?.hasHeader || !options?.includeTopInset) {
    return basePadding;
  }

  return basePadding + Math.max(top, spacing.sm);
};

export const useTabScreenBottomPadding = (basePadding: number = TAB_SCREEN_BOTTOM_GUTTER) => {
  const safeBottomPadding = useSafeBottomPadding();

  return basePadding + safeBottomPadding;
};
