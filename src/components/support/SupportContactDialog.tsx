import { Image, Modal, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { SUPPORT_STAFF_PHONE } from '@/src/shared/constants/support';
import { openSupportPhone, openSupportZalo } from '@/src/shared/lib/support-contact';
import { colors, typography, spacing, borderRadius, fontFamilyForWeight, shadows } from '@/src/theme/tokens';

const phoneIcon = require('../../../assets/images/support-phone-icon.png') as ImageSourcePropType;
const zaloIcon = require('../../../assets/images/zalo-icon.png') as ImageSourcePropType;

interface SupportContactDialogProps {
  visible: boolean;
  onClose: () => void;
}

interface ContactOptionRowProps {
  icon: ImageSourcePropType;
  title: string;
  subtitle: string;
  onPress: () => void;
  accessibilityLabel: string;
}

function ContactOptionRow({
  icon,
  title,
  subtitle,
  onPress,
  accessibilityLabel,
}: ContactOptionRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.optionIconWrap}>
        <Image source={icon} style={styles.optionIcon} resizeMode="contain" />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

export function SupportContactDialog({ visible, onClose }: SupportContactDialogProps) {
  const handlePhonePress = () => {
    onClose();
    void openSupportPhone();
  };

  const handleZaloPress = () => {
    onClose();
    void openSupportZalo();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Liên hệ hỗ trợ</Text>
              <Text style={styles.description}>Chọn kênh liên hệ với nhân viên hỗ trợ.</Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              hitSlop={8}
            >
              <Feather name="x" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.options}>
            <ContactOptionRow
              icon={phoneIcon}
              title={SUPPORT_STAFF_PHONE}
              subtitle="Gọi điện thoại"
              onPress={handlePhonePress}
              accessibilityLabel={`Gọi nhân viên hỗ trợ ${SUPPORT_STAFF_PHONE}`}
            />
            <ContactOptionRow
              icon={zaloIcon}
              title="Liên hệ qua Zalo"
              subtitle="Nhắn tin với nhân viên hỗ trợ"
              onPress={handleZaloPress}
              accessibilityLabel="Nhắn tin Zalo với nhân viên hỗ trợ"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,20,0.42)',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  description: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    fontFamily: fontFamilyForWeight('500'),
    color: colors.textSecondary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  options: {
    gap: spacing.md,
  },
  optionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  optionRowPressed: {
    opacity: 0.72,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  optionIcon: {
    width: 36,
    height: 36,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
  },
  optionSubtitle: {
    marginTop: 2,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    fontFamily: fontFamilyForWeight('500'),
    color: colors.textSecondary,
  },
});
