import { View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, borderRadius, shadows, spacing } from '@/src/theme/tokens';

interface AppCardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}

export function AppCard({ children, style, noPadding = false, ...props }: AppCardProps) {
  return (
    <View 
      style={[
        styles.card, 
        !noPadding && styles.padding,
        style
      ]} 
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  padding: {
    padding: spacing.base,
  }
});
