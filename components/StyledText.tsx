import { Text, TextProps } from './Themed';
import { typography } from '@/src/theme/tokens';

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: typography.fontFamily.regular }]} />;
}
