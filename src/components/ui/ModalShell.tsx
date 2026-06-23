import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { useSafeBottomPadding } from '@/src/shared/lib/layout/safe-area';

interface ModalShellProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Vùng cố định ở đáy modal (vd. nút hành động "Đóng" / "Đăng ký").
   * Nằm ngoài ScrollView nên luôn hiển thị, không phải cuộn xuống mới thấy.
   */
  footer?: React.ReactNode;
}

export function ModalShell({ visible, title, onClose, children, footer }: ModalShellProps) {
  const { top } = useSafeAreaInsets();
  const safeBottomPadding = useSafeBottomPadding();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* KeyboardAvoidingView nâng cả sheet lên trên bàn phím một cách mượt mà,
          thay cho cơ chế tự lắng nghe keyboard + đổi vị trí (vốn bị "bật lại" khi scroll). */}
      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.backdrop, { paddingTop: Math.max(top, spacing.sm) }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              style={styles.close}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              hitSlop={8}
            >
              <Feather name="x" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: footer ? spacing.md : safeBottomPadding },
            ]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? (
            <View style={[styles.footer, { paddingBottom: safeBottomPadding }]}>{footer}</View>
          ) : null}
        </View>
        <Toast />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,20,20,0.35)',
  },
  sheet: {
    maxHeight: '88%',
    // flexShrink để sheet co lại vừa khít phần trống phía trên bàn phím,
    // nhờ vậy header không bị đẩy khuất lên trên khi form dài + bàn phím mở.
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
  },
  content: {
    flexGrow: 1,
  },
  scroll: {
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
