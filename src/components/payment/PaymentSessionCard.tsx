import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { EncodingType, File, Paths } from 'expo-file-system';
import { requireOptionalNativeModule } from 'expo-modules-core';
import Toast from 'react-native-toast-message';

import { AppCard } from '@/src/components/ui/AppCard';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import type { CustomerPaymentSession } from '@/src/features/customer-portal/shared/types/customer-portal.types';
import { normalizeLabelKey, transactionPurposeLabel } from '@/src/shared/lib/labels';
import { borderRadius, colors, fontFamilyForWeight, spacing, typography } from '@/src/theme/tokens';

interface PaymentSessionCardProps {
  session: CustomerPaymentSession;
  onViewImage: (url: string) => void;
  isPending?: boolean;
  showHeader?: boolean;
  embedded?: boolean;
  secondaryAction?: 'copy-content' | 'save-qr';
}

const SHIPPING_PAYMENT_PURPOSE_KEYS = [
  'SHIPPING_FEE_PAYMENT',
  'THANH_TOAN_VAN_CHUYEN',
  'CHO_THANH_TOAN_SHIP',
];

const isShippingPaymentSession = (session: CustomerPaymentSession) =>
  SHIPPING_PAYMENT_PURPOSE_KEYS.includes(normalizeLabelKey(session.purpose || session.paymentType));

const getQrFileName = (paymentCode?: string | null) => {
  const suffix = (paymentCode || String(Date.now())).replace(/[^a-zA-Z0-9_-]/g, '-');
  return `tiximax-ship-qr-${suffix}.png`;
};

type MediaPermissionResponse = {
  status?: string;
  granted?: boolean;
};

type ExpoMediaLibraryNextModule = {
  requestPermissionsAsync?: (
    writeOnly?: boolean,
    granularPermissions?: string[],
  ) => Promise<MediaPermissionResponse>;
  Asset?: {
    create?: (filePath: string) => Promise<unknown>;
  };
};

type ExpoMediaLibraryLegacyModule = {
  requestPermissionsAsync?: (
    writeOnly?: boolean,
    granularPermissions?: string[],
  ) => Promise<MediaPermissionResponse>;
  saveToLibraryAsync?: (localUri: string) => Promise<void>;
  createAssetAsync?: (localUri: string) => Promise<unknown>;
};

const showMissingMediaLibraryToast = () => {
  Toast.show({
    type: 'error',
    text1: 'Cần cài lại app để lưu QR',
    text2: 'Dev client hiện tại chưa có module lưu ảnh.',
  });
};

const saveQrToLibrary = async (session: CustomerPaymentSession) => {
  if (!session.qrCode) {
    Toast.show({ type: 'error', text1: 'Không lưu được QR, vui lòng thử lại' });
    return;
  }

  try {
    const mediaLibraryNext =
      requireOptionalNativeModule<ExpoMediaLibraryNextModule>('ExpoMediaLibraryNext');
    const mediaLibraryLegacy =
      requireOptionalNativeModule<ExpoMediaLibraryLegacyModule>('ExpoMediaLibrary');

    if (!mediaLibraryNext && !mediaLibraryLegacy) {
      showMissingMediaLibraryToast();
      return;
    }

    const requestPermissions =
      mediaLibraryNext?.requestPermissionsAsync ?? mediaLibraryLegacy?.requestPermissionsAsync;
    if (!requestPermissions) {
      showMissingMediaLibraryToast();
      return;
    }

    const permission = await requestPermissions(true, ['photo']);
    if (permission.status !== 'granted' && !permission.granted) {
      Toast.show({ type: 'error', text1: 'Cần cấp quyền thư viện ảnh để lưu QR' });
      return;
    }

    let file = new File(Paths.cache, getQrFileName(session.paymentCode));
    const dataUriMatch = session.qrCode.match(/^data:image\/(?:png|jpeg|jpg);base64,(.+)$/);
    if (dataUriMatch?.[1]) {
      file.write(dataUriMatch[1], { encoding: EncodingType.Base64 });
    } else if (/^[A-Za-z0-9+/=]+$/.test(session.qrCode) && session.qrCode.length > 100) {
      file.write(session.qrCode, { encoding: EncodingType.Base64 });
    } else {
      file = await File.downloadFileAsync(session.qrCode, file, { idempotent: true });
    }

    if (mediaLibraryLegacy?.saveToLibraryAsync) {
      await mediaLibraryLegacy.saveToLibraryAsync(file.uri);
    } else if (mediaLibraryLegacy?.createAssetAsync) {
      await mediaLibraryLegacy.createAssetAsync(file.uri);
    } else if (mediaLibraryNext?.Asset?.create) {
      await mediaLibraryNext.Asset.create(file.uri);
    } else {
      showMissingMediaLibraryToast();
      return;
    }

    Toast.show({ type: 'success', text1: 'Đã lưu QR vào thư viện ảnh' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('ExpoMediaLibrary')) {
      Toast.show({
        type: 'error',
        text1: 'Cần cài lại app để lưu QR',
        text2: 'Dev client hiện tại chưa có module lưu ảnh.',
      });
      return;
    }
    Toast.show({ type: 'error', text1: 'Không lưu được QR, vui lòng thử lại' });
  }
};

export function PaymentSessionCard({
  session,
  onViewImage,
  isPending = false,
  showHeader = true,
  embedded = false,
  secondaryAction = 'copy-content',
}: PaymentSessionCardProps) {
  const purposeLabel = isShippingPaymentSession(session)
    ? 'Thanh toán vận chuyển'
    : transactionPurposeLabel(session.purpose || session.paymentType);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState(false);
  const showQr = Boolean(session.qrCode) && !qrError;

  return (
    <AppCard style={[styles.qrCard, embedded && styles.qrCardEmbedded]}>
      {showHeader ? (
        <View style={styles.qrHeader}>
          <Text style={styles.qrTitle}>{purposeLabel}</Text>
          <View style={styles.qrStatusWrap}>
            <StatusBadge status={session.status} />
          </View>
        </View>
      ) : null}

      <View style={styles.paymentContentBox}>
        {session.paymentCode ? (
          <Pressable
            style={styles.paymentInfoRow}
            accessibilityRole="button"
            accessibilityLabel="Sao chép mã thanh toán"
            onPress={async () => {
              await Clipboard.setStringAsync(session.paymentCode || '');
              Toast.show({ type: 'success', text1: 'Đã copy mã thanh toán' });
            }}
          >
            <Text style={styles.paymentInfoLabel}>Mã thanh toán:</Text>
            <View style={styles.copyValueWrap}>
              <Text style={styles.paymentInfoValue}>{session.paymentCode}</Text>
              <Feather name="copy" size={11} color={colors.primaryDark} />
            </View>
          </Pressable>
        ) : null}

        {showQr ? (
          <View style={[styles.qrCenterBox, isPending && styles.qrCenterBoxActive]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Phóng to mã QR thanh toán"
              onPress={() => onViewImage(session.qrCode!)}
            >
              <View style={styles.qrImageSquare}>
                <Image
                  source={{ uri: session.qrCode! }}
                  style={styles.qrImageFill}
                  resizeMode="contain"
                  onLoadStart={() => setQrLoading(true)}
                  onLoadEnd={() => setQrLoading(false)}
                  onError={() => {
                    setQrLoading(false);
                    setQrError(true);
                  }}
                />
                {qrLoading ? (
                  <View style={styles.qrSkeleton}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : null}
              </View>
            </Pressable>
            <Text style={styles.qrCenterHint}>
              {isPending ? 'Nhấn để phóng to · Quét để thanh toán' : 'Nhấn để phóng to'}
            </Text>
          </View>
        ) : null}

        {showQr || session.content ? (
          <View style={styles.qrBtnRow}>
            {showQr ? (
              <Pressable
                style={styles.qrBtnPrimary}
                accessibilityRole="button"
                accessibilityLabel="Xem mã QR"
                onPress={() => onViewImage(session.qrCode!)}
              >
                <Feather name="maximize-2" size={13} color={colors.black} />
                <Text style={styles.qrBtnText}>Xem QR</Text>
              </Pressable>
            ) : null}
            {secondaryAction === 'save-qr' && showQr ? (
              <Pressable
                style={styles.qrBtnSecondary}
                accessibilityRole="button"
                accessibilityLabel="Lưu mã QR"
                onPress={() => void saveQrToLibrary(session)}
              >
                <Feather name="download" size={13} color={colors.textPrimary} />
                <Text style={styles.qrBtnTextSecondary}>Lưu QR</Text>
              </Pressable>
            ) : session.content ? (
              <Pressable
                style={styles.qrBtnSecondary}
                accessibilityRole="button"
                accessibilityLabel="Sao chép nội dung chuyển khoản"
                onPress={async () => {
                  await Clipboard.setStringAsync(session.content || '');
                  Toast.show({ type: 'success', text1: 'Đã copy nội dung chuyển khoản' });
                }}
              >
                <Feather name="copy" size={13} color={colors.textPrimary} />
                <Text style={styles.qrBtnTextSecondary}>Sao chép CK</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {session.bankAccount ? (
        <View style={styles.bankBox}>
          <InfoRow label="Ngân hàng" value={session.bankAccount.bankName} />
          <CopyableInfoRow
            label="Số tài khoản"
            value={session.bankAccount.accountNumber}
            toastText="Đã copy số tài khoản"
          />
          <InfoRow label="Chủ tài khoản" value={session.bankAccount.accountHolder} />
        </View>
      ) : null}
    </AppCard>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '---'}</Text>
    </View>
  );
}

function CopyableInfoRow({
  label,
  value,
  toastText,
}: {
  label: string;
  value?: string | null;
  toastText: string;
}) {
  if (!value) return <InfoRow label={label} value={value} />;

  return (
    <Pressable
      style={[styles.infoRow, styles.copyRowTouch]}
      accessibilityRole="button"
      accessibilityLabel={`Sao chép ${label}`}
      onPress={async () => {
        await Clipboard.setStringAsync(value);
        Toast.show({ type: 'success', text1: toastText });
      }}
    >
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.copyValueWrap}>
        <Text style={styles.infoValue}>{value}</Text>
        <Feather name="copy" size={11} color={colors.primaryDark} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  qrCard: {
    marginBottom: spacing.md,
  },
  qrCardEmbedded: {
    marginBottom: spacing.sm,
  },
  qrHeader: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  qrTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  qrStatusWrap: {
    alignSelf: 'flex-start',
  },
  paymentContentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  paymentInfoRow: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  paymentInfoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontFamily: fontFamilyForWeight('400'),
  },
  paymentInfoValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textPrimary,
  },
  copyValueWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  qrCenterBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  qrCenterBoxActive: {
    borderWidth: 2,
    borderColor: 'rgba(247, 184, 45, 0.5)',
  },
  qrImageSquare: {
    width: 180,
    height: 180,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImageFill: {
    width: '100%',
    height: '100%',
  },
  qrSkeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  qrCenterHint: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  qrBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  qrBtnPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  qrBtnSecondary: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  qrBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.black,
  },
  qrBtnTextSecondary: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  bankBox: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  copyRowTouch: {
    minHeight: 44,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
});
