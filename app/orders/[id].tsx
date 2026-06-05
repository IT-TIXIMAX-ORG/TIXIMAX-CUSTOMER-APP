import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { ENV_CONFIG } from '@/src/shared/constants/env.constants';
import { useCustomerOrderDetail } from '@/src/features/customer-portal/shared/hooks/use-customer-portal-data';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { formatCurrency, formatDate, formatWeight } from '@/src/shared/lib/utils';
import { AppCard } from '@/src/components/ui/AppCard';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { humanizeEnum, orderLogActionLabel, orderTypeLabel, transactionPurposeLabel } from '@/src/shared/lib/labels';

const normalizeImageUrl = (value?: string | null) => {
  const url = value?.trim();
  if (!url) return null;
  if (/^[a-z][a-z\d+\-.]*:/i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${ENV_CONFIG.apiBaseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const orderId = String(id || '');
  const { data: order, isFetching, isLoading, refetch } = useCustomerOrderDetail(orderId);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageError, setSelectedImageError] = useState(false);
  const reloadOrder = () => {
    void refetch();
  };
  const openImage = (url: string) => {
    setSelectedImageError(false);
    setSelectedImageUrl(url);
  };
  const closeImage = () => {
    setSelectedImageUrl(null);
    setSelectedImageError(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-circle" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>Không tìm thấy đơn hàng</Text>
        <ReloadButton isFetching={isFetching} onPress={reloadOrder} style={styles.centerReloadButton} />
      </View>
    );
  }

  const expectedAmountVnd = order.finalPriceOrder ?? order.productPayment?.expectedAmountVnd ?? 0;
  const paidProductAmount = order.productPayment?.paidAmountVnd ?? 0;
  const shippingAmountVnd =
    order.shippingPayment?.expectedAmountVnd ??
    order.shippingEstimation?.totalEstimatedFee ??
    order.estimatedShippingFee ??
    0;
  const routeCurrency = order.routeCurrency?.trim() || order.currency?.trim() || 'JPY';
  const paymentSessions = order.paymentSessions?.length
    ? order.paymentSessions
    : order.paymentSession
      ? [order.paymentSession]
      : [];
  const gallery = Array.from(
    new Set(
      order.orderLinks
        .flatMap((link) => [link.imageUrl, link.purchaseImageUrl, link.warehouseImageUrl, link.warehouseCheckImageUrl])
        .map(normalizeImageUrl)
        .filter((url): url is string => Boolean(url)),
    ),
  );

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.topActions}>
          <ReloadButton isFetching={isFetching} onPress={reloadOrder} />
        </View>

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.orderCode}>{order.orderCode}</Text>
            <StatusBadge status={order.status} />
          </View>
          <Text style={styles.orderType}>
            {orderTypeLabel(order.orderType)} • {formatDate(order.createdAt)}
          </Text>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Tổng giá trị đơn hàng</Text>
            <Text style={styles.totalValue}>{formatCurrency(expectedAmountVnd)}</Text>
          </View>
        </View>

        <Section title="Thanh toán" icon="credit-card">
          <AppCard style={styles.paymentSummary}>
            <InfoRow label="Tiền hàng dự kiến" value={formatCurrency(expectedAmountVnd)} />
            <InfoRow label="Đã thanh toán tiền hàng" value={formatCurrency(paidProductAmount)} />
            <InfoRow label="Phí vận chuyển dự kiến" value={formatCurrency(shippingAmountVnd)} />
            {order.orderType === 'DAU_GIA' && order.paymentAfterAuction ? (
              <InfoRow label="Thanh toán sau đấu giá" value={formatCurrency(order.paymentAfterAuction)} />
            ) : null}
            <InfoRow label="Phụ thu sản phẩm" value={formatCurrency(order.orderLinks.reduce((sum, link) => sum + (link.extraCharge ?? 0), 0))} />
          </AppCard>

          {paymentSessions.length ? (
            paymentSessions.map((session, index) => {
              return (
                <AppCard key={`${session.paymentId || session.id || index}`} style={styles.qrCard}>
                  <View style={styles.qrHeader}>
                    <View>
                      <Text style={styles.qrTitle}>{transactionPurposeLabel(session.purpose || session.paymentType)}</Text>
                    </View>
                    <StatusBadge status={session.status} />
                  </View>
                  {session.qrCode ? (
                    <Image source={{ uri: session.qrCode }} style={styles.qrImage} resizeMode="contain" />
                  ) : null}
                  {session.content ? (
                    <Pressable
                      style={styles.copyBox}
                      onPress={async () => {
                        await Clipboard.setStringAsync(session.content || '');
                        Toast.show({ type: 'success', text1: 'Đã copy nội dung chuyển khoản' });
                      }}
                    >
                      <Text style={styles.copyText}>{session.content}</Text>
                      <Feather name="copy" size={14} color={colors.primaryDark} />
                    </Pressable>
                  ) : null}
                  {session.bankAccount ? (
                    <View style={styles.bankBox}>
                      <InfoRow label="Ngân hàng" value={session.bankAccount.bankName} />
                      <InfoRow label="Số tài khoản" value={session.bankAccount.accountNumber} />
                      <InfoRow label="Chủ tài khoản" value={session.bankAccount.accountHolder} />
                    </View>
                  ) : null}
                </AppCard>
              );
            })
          ) : (
            <Text style={styles.mutedText}>Chưa có phiên thanh toán đang chờ.</Text>
          )}
        </Section>

        <Section title={`Sản phẩm (${order.orderLinks.length})`} icon="shopping-bag">
          {order.orderLinks.map((link) => {
            const productImageUrl = [
              link.warehouseImageUrl,
              link.purchaseImageUrl,
              link.imageUrl,
              link.warehouseCheckImageUrl,
            ]
              .map(normalizeImageUrl)
              .find((url): url is string => Boolean(url));

            return (
              <AppCard key={link.orderLinkId} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.productBadge}>
                    <Text style={styles.productBadgeText}>{link.productTypeName || 'Chung'}</Text>
                  </View>
                  <StatusBadge status={link.status || link.orderStatus || ''} />
                </View>
                <Text style={styles.productName}>{link.productName || 'Sản phẩm chưa có tên'}</Text>
                {productImageUrl ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Xem ảnh ${link.productName || 'sản phẩm'}`}
                    onPress={() => openImage(productImageUrl)}
                    style={({ pressed }) => [styles.productImageButton, pressed && styles.imagePressed]}
                  >
                    <Image source={{ uri: productImageUrl }} style={styles.productImage} />
                  </Pressable>
                ) : null}
                <InfoRow label="Số lượng" value={String(link.quantity ?? '---')} />
                <InfoRow label="Giá web" value={`${link.priceWeb ?? 0} ${routeCurrency}`} />
                <InfoRow label="Ship web" value={formatCurrency(link.shipWeb ?? 0)} />
                <InfoRow label="Thành tiền" value={formatCurrency(link.finalPriceVnd ?? 0)} />
                {link.extraCharge ? <InfoRow label="Phụ thu" value={formatCurrency(link.extraCharge)} /> : null}
                {link.trackingCode ? <InfoRow label="Tracking" value={link.trackingCode} /> : null}
                {link.shipmentCode ? <InfoRow label="Mã vận đơn" value={link.shipmentCode} /> : null}
                {link.note ? <Text style={styles.noteText}>{link.note}</Text> : null}
              </AppCard>
            );
          })}
        </Section>

        <Section title="Vận chuyển" icon="truck">
          {order.shippingEstimation?.shipmentGroups?.length ? (
            order.shippingEstimation.shipmentGroups.map((group) => (
              <AppCard key={group.shipmentCode} style={styles.shipmentCard}>
                <Text style={styles.shipmentCode}>{group.shipmentCode}</Text>
                <InfoRow label="Số link" value={String(group.linkCount)} />
                <InfoRow label="Cân nặng tính phí" value={formatWeight(group.chargeableWeight)} />
                <InfoRow label="Đơn giá/kg" value={formatCurrency(group.priceShipPerKg ?? 0)} />
                <InfoRow label="Phí dự kiến" value={formatCurrency(group.estimatedFee ?? 0)} />
              </AppCard>
            ))
          ) : (
            <Text style={styles.mutedText}>Chưa có dự toán vận chuyển.</Text>
          )}
        </Section>

        {order.allingoDeliveries?.length ? (
          <Section title="Allingo nội địa" icon="navigation">
            {order.allingoDeliveries.map((delivery) => (
              <AppCard key={delivery.allingoOrderId} style={styles.shipmentCard}>
                <Text style={styles.shipmentCode}>{delivery.allingoServiceName || delivery.shipCode || delivery.allingoOrderId}</Text>
                <InfoRow label="Trạng thái" value={humanizeEnum(delivery.allingoStatus)} />
                <InfoRow label="Phí báo giá" value={formatCurrency(delivery.allingoQuotedPrice ?? 0)} />
              </AppCard>
            ))}
          </Section>
        ) : null}

        {gallery.length ? (
          <Section title="Hình ảnh" icon="image">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {gallery.map((url, index) => (
                <Pressable
                  key={url}
                  accessibilityRole="button"
                  accessibilityLabel={`Xem hình ảnh ${index + 1}`}
                  onPress={() => openImage(url)}
                  style={({ pressed }) => [styles.galleryImageButton, pressed && styles.imagePressed]}
                >
                  <Image source={{ uri: url }} style={styles.galleryImage} />
                </Pressable>
              ))}
            </ScrollView>
          </Section>
        ) : null}

        <Section title="Hành trình đơn hàng" icon="clock">
          <AppCard style={styles.journeyCard}>
            {!order.processLogs || order.processLogs.length === 0 ? (
              <EmptyState icon="clock" title="Chưa có cập nhật" />
            ) : (
              [...order.processLogs].reverse().map((log, i, arr) => {
                const isLast = i === arr.length - 1;
                const isFirst = i === 0;
                return (
                  <View key={log.logId} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, isFirst && styles.timelineDotActive]} />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineAction, isFirst && styles.timelineActionActive]}>
                        {orderLogActionLabel(log.action)}
                      </Text>
                      <Text style={styles.timelineDate}>{formatDate(log.createdAt)}</Text>
                      {log.note ? <Text style={styles.timelineNote}>{log.note}</Text> : null}
                      {log.actionCode ? <Text style={styles.timelineCode}>{log.actionCode}</Text> : null}
                    </View>
                  </View>
                );
              })
            )}
          </AppCard>
        </Section>
      </ScrollView>

      <Modal visible={Boolean(selectedImageUrl)} transparent animationType="fade" onRequestClose={closeImage}>
        <View style={styles.imageViewer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng ảnh"
            style={styles.imageViewerClose}
            onPress={closeImage}
          >
            <Feather name="x" size={24} color={colors.white} />
          </Pressable>
          {selectedImageUrl ? (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.imageViewerImage}
              resizeMode="contain"
              onError={() => {
                setSelectedImageError(true);
                Toast.show({ type: 'error', text1: 'Không thể tải hình ảnh' });
              }}
            />
          ) : null}
          {selectedImageError ? (
            <View style={styles.imageViewerError}>
              <Feather name="alert-circle" size={28} color={colors.white} />
              <Text style={styles.imageViewerErrorText}>Không thể tải hình ảnh</Text>
            </View>
          ) : null}
          <Toast />
        </View>
      </Modal>
    </>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Feather name={icon} size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ReloadButton({
  isFetching,
  onPress,
  style,
}: {
  isFetching: boolean;
  onPress: () => void;
  style?: object;
}) {
  return (
    <Pressable
      disabled={isFetching}
      onPress={onPress}
      style={({ pressed }) => [
        styles.reloadButton,
        style,
        pressed && styles.reloadButtonPressed,
        isFetching && styles.reloadButtonDisabled,
      ]}
    >
      {isFetching ? (
        <ActivityIndicator size="small" color={colors.primaryDark} />
      ) : (
        <Feather name="refresh-cw" size={16} color={colors.primaryDark} />
      )}
      <Text style={styles.reloadText}>{isFetching ? 'Đang tải' : 'Tải lại'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  centerReloadButton: {
    marginTop: spacing.lg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  reloadButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  reloadButtonPressed: {
    opacity: 0.75,
  },
  reloadButtonDisabled: {
    opacity: 0.7,
  },
  reloadText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  header: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius['2xl'],
    borderWidth: 2,
    borderColor: 'rgba(247, 184, 45, 0.2)',
    marginBottom: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  orderCode: {
    flex: 1,
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  orderType: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  totalContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    textTransform: 'uppercase',
  },
  paymentSummary: {
    marginBottom: spacing.md,
  },
  qrCard: {
    marginBottom: spacing.md,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  qrTitle: {
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  qrImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  copyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  copyText: {
    flex: 1,
    color: colors.primaryDark,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  bankBox: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  productCard: {
    marginBottom: spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  productBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  productBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  productImageButton: {
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.background,
  },
  imagePressed: {
    opacity: 0.75,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  noteText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  shipmentCard: {
    marginBottom: spacing.md,
  },
  shipmentCode: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  mutedText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  galleryImageButton: {
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  galleryImage: {
    width: 140,
    height: 140,
    backgroundColor: colors.surface,
  },
  imageViewer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
  },
  imageViewerClose: {
    position: 'absolute',
    top: spacing['3xl'],
    right: spacing.lg,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerError: {
    position: 'absolute',
    alignItems: 'center',
    gap: spacing.sm,
  },
  imageViewerErrorText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  journeyCard: {
    padding: spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(247, 184, 45, 0.3)',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.lg,
    paddingLeft: spacing.sm,
  },
  timelineAction: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  timelineActionActive: {
    color: colors.textPrimary,
  },
  timelineDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  timelineNote: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  timelineCode: {
    marginTop: spacing.xs,
    color: colors.primaryDark,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    fontSize: typography.fontSize.xs,
  },
});
