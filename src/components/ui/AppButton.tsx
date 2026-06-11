import { 
  StyleSheet, 
  Text, 
  Pressable, 
  type PressableProps, 
  type PressableStateCallbackType,
  ActivityIndicator,
  View,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import { colors, borderRadius, typography, spacing, fontFamilyForWeight } from '@/src/theme/tokens';

interface AppButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function AppButton({ 
  title, 
  variant = 'primary', 
  size = 'md',
  isLoading = false,
  icon,
  style,
  disabled,
  ...props 
}: AppButtonProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryBg;
      case 'outline':
        return styles.outlineBg;
      case 'ghost':
        return styles.ghostBg;
      case 'danger':
        return styles.dangerBg;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'outline':
        return styles.outlineText;
      case 'ghost':
        return styles.ghostText;
      case 'danger':
        return styles.dangerText;
    }
  };
  
  const getSizeStyle = () => {
    switch (size) {
      case 'sm': return styles.smSize;
      case 'md': return styles.mdSize;
      case 'lg': return styles.lgSize;
    }
  };

  const isDisabled = Boolean(disabled || isLoading);

  const resolveStyle = (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
    const customStyle = typeof style === 'function' ? style(state) : style;

    return [
      styles.base,
      getVariantStyle(),
      getSizeStyle(),
      state.pressed && !isDisabled && styles.pressed,
      isDisabled && styles.disabled,
      customStyle,
    ];
  };

  return (
    <Pressable
      style={resolveStyle}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      // Nút sm cao 36px — hitSlop bù để vùng chạm đạt tối thiểu 44px.
      hitSlop={size === 'sm' ? 6 : undefined}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator 
          color={variant === 'primary' || variant === 'danger' ? colors.white : colors.primary} 
          size="small" 
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.textBase, getTextStyle()]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  
  // Sizes
  smSize: { height: 36, paddingHorizontal: spacing.md },
  mdSize: { height: 44, paddingHorizontal: spacing.lg },
  lgSize: { height: 52, paddingHorizontal: spacing.xl },
  
  // Variants
  primaryBg: { backgroundColor: colors.primary },
  outlineBg: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  ghostBg: { backgroundColor: 'transparent' },
  dangerBg: { backgroundColor: colors.error },
  
  // Text
  textBase: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    letterSpacing: typography.letterSpacing.wide,
  },
  primaryText: { color: colors.black },
  outlineText: { color: colors.primary },
  ghostText: { color: colors.primary },
  dangerText: { color: colors.white },
});
