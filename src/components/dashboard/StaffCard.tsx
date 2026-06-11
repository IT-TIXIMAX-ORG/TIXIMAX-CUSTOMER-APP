import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { AppCard } from '../ui/AppCard';

interface StaffCardProps {
  name: string;
  phone?: string;
  avatarUrl?: string;
}

export function StaffCard({ name, phone }: StaffCardProps) {
  const handleCall = () => {
    if (phone) {
      void Linking.openURL(`tel:${phone}`);
    }
  };

  return (
    <AppCard style={styles.container}>
      <View style={styles.infoContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0)}</Text>
          <View style={styles.onlineBadge} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Nhân viên hỗ trợ</Text>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            {phone ? (
              <>
                <Text style={styles.divider}>|</Text>
                <Text style={styles.phone}>{phone}</Text>
              </>
            ) : null}
          </View>
        </View>
      </View>
      {phone ? (
        <Pressable
          style={styles.callButton}
          accessibilityRole="button"
          accessibilityLabel={`Gọi nhân viên hỗ trợ ${phone}`}
          onPress={handleCall}
        >
          <Text style={styles.callButtonText}>Gọi ngay</Text>
        </Pressable>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.black,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: '#94A3B8',
    letterSpacing: typography.letterSpacing.widest,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.white,
  },
  divider: {
    color: '#475569',
    marginHorizontal: spacing.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  phone: {
    flexShrink: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: '#94A3B8',
  },
  callButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  callButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    fontSize: typography.fontSize.sm,
  },
});
