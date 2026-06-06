import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography, fontFamilyForWeight } from '@/src/theme/tokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Không tìm thấy trang' }} />
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Feather name="compass" size={36} color={colors.primaryDark} />
        </View>
        <Text style={styles.title}>Không tìm thấy nội dung</Text>
        <Text style={styles.description}>
          Trang bạn tìm không tồn tại hoặc đã được di chuyển. Vui lòng quay lại trang chủ.
        </Text>

        <Link href="/" style={styles.button}>
          <Text style={styles.buttonText}>Về trang chủ</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.base,
    fontFamily: fontFamilyForWeight('400'),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  buttonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.black,
  },
});
