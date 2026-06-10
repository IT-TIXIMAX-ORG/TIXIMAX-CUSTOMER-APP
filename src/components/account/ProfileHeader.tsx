// Khối thông tin user đầu màn hình Tài khoản (avatar chữ cái, tên, email).

import { StyleSheet, Text, View } from 'react-native';

import { colors, typography, spacing, fontFamilyForWeight } from '@/src/theme/tokens';

type Props = {
  name: string;
  email: string;
};

export function ProfileHeader({ name, email }: Props) {
  return (
    <View style={styles.profileCard}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.userName}>{name}</Text>
        <Text style={styles.userEmail}>{email}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.black,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.md,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
});
