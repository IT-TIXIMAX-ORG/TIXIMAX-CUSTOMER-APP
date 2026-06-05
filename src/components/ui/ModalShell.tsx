import { useEffect, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  keyboardContentMaxHeight?: number;
}

export function ModalShell({
  visible,
  title,
  onClose,
  children,
  keyboardContentMaxHeight,
}: ModalShellProps) {
  const { top } = useSafeAreaInsets();
  const safeBottomPadding = useSafeBottomPadding();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) setIsKeyboardVisible(false);
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          isKeyboardVisible && styles.backdropWithKeyboard,
          isKeyboardVisible && { paddingTop: Math.max(top, spacing.sm) },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable style={styles.close} onPress={onClose}>
              <Feather name="x" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            style={[
              styles.scroll,
              isKeyboardVisible && keyboardContentMaxHeight
                ? { maxHeight: keyboardContentMaxHeight }
                : null,
            ]}
            contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
        <Toast />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,20,20,0.35)',
  },
  backdropWithKeyboard: {
    justifyContent: 'flex-start',
  },
  sheet: {
    maxHeight: '88%',
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
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
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
});
