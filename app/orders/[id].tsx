import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { useQuery } from '@tanstack/react-query';
import { useScreenContentTopPadding } from '@/src/shared/lib/layout/safe-area';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { ENV_CONFIG } from '@/src/shared/constants/env.constants';
import { useCustomerOrderDetail } from '@/src/features/customer-portal/shared/hooks/use-customer-portal-data';
import { getRoutes } from '@/src/features/customer-portal/shared/services/master-data.service';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { formatCurrency, formatDate, formatWeight } from '@/src/shared/lib/utils';
import { AppCard } from '@/src/components/ui/AppCard';
import { EmptyState } from '@/src/components/ui/EmptyState';
import {
  humanizeEnum,
  normalizeLabelKey,
  orderLogActionLabel,
  orderTypeLabel,
  transactionPurposeLabel,
} from '@/src/shared/lib/labels';
import type { CustomerOrderDetail, CustomerOrderLink, CustomerPaymentSession, SupportStaff } from '@/src/features/customer-portal/shared/types/customer-portal.types';

const normalizeImageUrl = (value?: string | null) => {
  const url = value?.trim();
  if (!url) return null;
  if (/^[a-z][a-z\d+\-.]*:/i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${ENV_CONFIG.apiBaseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
};

// Đợt thanh toán coi như đã xong / không cần thao tác (để thu gọn).
const NON_PENDING_PAYMENT_KEYS = ['DA_THANH_TOAN', 'SUCCESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'DA_HUY', 'YEU_CAU_HUY'];
const isPendingSession = (status?: string | null) => !NON_PENDING_PAYMENT_KEYS.includes(normalizeLabelKey(status));
const SUCCESSFUL_PAYMENT_KEYS = ['DA_THANH_TOAN', 'SUCCESS', 'COMPLETED', 'DA_THANH_TOAN_SHIP'];
const SHIPPING_PAYMENT_PURPOSE_KEYS = ['SHIPPING_FEE_PAYMENT', 'THANH_TOAN_VAN_CHUYEN', 'CHO_THANH_TOAN_SHIP'];
const PRODUCT_PAYMENT_PURPOSE_KEYS = [
  'ORDER_PAYMENT',
  'THANH_TOAN_TIEN_HANG',
  'THANH_TOAN_DON_HANG',
  'AUCTION_PAYMENT',
  'PURCHASE_FEE_PAYMENT',
];
const ORDER_STATUSES_AFTER_SHIPPING_PAYMENT = new Set([
  'CHO_GIAO',
  'DANG_GIAO',
  'DA_GIAO',
  'COMPLETED',
]);
const isShippingPaymentSession = (session: CustomerPaymentSession) =>
  SHIPPING_PAYMENT_PURPOSE_KEYS.includes(normalizeLabelKey(session.purpose || session.paymentType));
const isProductPaymentSession = (session: CustomerPaymentSession) =>
  PRODUCT_PAYMENT_PURPOSE_KEYS.includes(normalizeLabelKey(session.purpose || session.paymentType));
const isSuccessfulSession = (session: CustomerPaymentSession) =>
  SUCCESSFUL_PAYMENT_KEYS.includes(normalizeLabelKey(session.status));
const inferCurrencyFromRouteName = (routeName?: string | null) => {
  const normalized = normalizeLabelKey(routeName);
  if (!normalized) return null;
  if (normalized.includes('NHAT') || normalized.includes('JAPAN') || normalized.includes('JP')) return 'JPY';
  if (normalized.includes('HAN') || normalized.includes('KOREA') || normalized.includes('KR')) return 'KRW';
  if (normalized.includes('TRUNG') || normalized.includes('CHINA') || normalized.includes('CN')) return 'CNY';
  if (normalized.includes('MY') || normalized.includes('USA') || normalized.includes('US')) return 'USD';
  if (normalized.includes('THAI') || normalized.includes('THAILAND') || normalized.includes('TH')) return 'THB';
  if (normalized.includes('INDO') || normalized.includes('INDONESIA') || normalized.includes('ID')) return 'IDR';
  return null;
};
const normalizeJourneyCode = (value?: string | null) => normalizeLabelKey(value).replace(/_/g, '');
const getTimelineImageUrls = (log: CustomerOrderDetail['processLogs'][number], orderLinks: CustomerOrderLink[]) => {
  const actionKey = normalizeLabelKey(log.action);
  const actionLabelKey = normalizeLabelKey(orderLogActionLabel(log.action));
  const noteKey = normalizeLabelKey(log.note);
  const phaseKey = [actionKey, actionLabelKey, noteKey].filter(Boolean).join('_');
  const actionCodeKey = normalizeJourneyCode(log.actionCode);
  const relatedLinks = orderLinks.filter((link) => {
    if (log.linkId && String(link.orderLinkId) === String(log.linkId)) {
      return true;
    }

    const shipmentCodeKey = normalizeJourneyCode(link.shipmentCode);
    const trackingCodeKey = normalizeJourneyCode(link.trackingCode);
    const orderLinkKey = normalizeJourneyCode(link.orderLinkId);

    if (actionCodeKey) {
      return actionCodeKey === shipmentCodeKey || actionCodeKey === trackingCodeKey || actionCodeKey === orderLinkKey;
    }

    return Boolean(
      (shipmentCodeKey && noteKey.includes(shipmentCodeKey)) ||
      (trackingCodeKey && noteKey.includes(trackingCodeKey)) ||
      (orderLinkKey && noteKey.includes(orderLinkKey)),
    );
  });

  const pickUniqueImages = (
    values: Array<string | null | undefined>,
  ) =>
    Array.from(
      new Set(
        values
          .map(normalizeImageUrl)
          .filter((url): url is string => Boolean(url)),
      ),
    );

  const imageCandidates = relatedLinks.flatMap((link) => {
    if (phaseKey.includes('MUA_HANG') || phaseKey.includes('DA_MUA') || phaseKey.includes('MUA')) {
      return pickUniqueImages([link.purchaseImageUrl, link.imageUrl]);
    }

    if (phaseKey.includes('KHO_NUOC_NGOAI') || phaseKey.includes('FOREIGN_WAREHOUSE')) {
      return pickUniqueImages([link.warehouseImageUrl]);
    }

    if (
      phaseKey.includes('KIEM_HANG') ||
      phaseKey.includes('DONG_GOI') ||
      phaseKey.includes('KHO_NOI_DIA') ||
      phaseKey.includes('KHO_VIET_NAM') ||
      phaseKey.includes('NHAP_KHO_VIET_NAM') ||
      phaseKey.includes('NHAP_KHO_NOI_DIA') ||
      phaseKey.includes('CHO_NHAP_KHO') ||
      phaseKey.includes('SHIP')
    ) {
      return pickUniqueImages([link.warehouseCheckImageUrl, link.warehouseImageUrl]);
    }

    return [];
  });

  return Array.from(
    new Set(
      imageCandidates.filter((url): url is string => Boolean(url)),
    ),
  );
};
const sessionKey = (session: CustomerPaymentSession, index: number) =>
  String(session.paymentId || session.id || session.paymentCode || index);

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const orderId = String(id || '');
  const { data: order, isLoading, refetch } = useCustomerOrderDetail(orderId);
  const { data: routes = [] } = useQuery({
    queryKey: ['mobile-master-data', 'routes'],
    queryFn: getRoutes,
    staleTime: 5 * 60 * 1000,
  });
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const contentPaddingTop = useScreenContentTopPadding(spacing.sm, { hasHeader: true });
  const [selectedImageError, setSelectedImageError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [settledGroupExpanded, setSettledGroupExpanded] = useState(false);
  const [shippingGroupExpanded, setShippingGroupExpanded] = useState(false);
  const [productModuleExpanded, setProductModuleExpanded] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const toggleSession = (key: string) =>
    setExpandedSessions((prev) => ({ ...prev, [key]: !prev[key] }));
  const refreshOrder = async () => {
    if (Platform.OS === 'web' || isRefreshing) return;

    try {
      setIsRefreshing(true);
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.centerContent}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refreshOrder()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        <Feather name="alert-circle" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>Không tìm thấy đơn hàng</Text>
        <Text style={styles.errorHint}>Vuốt xuống để tải lại</Text>
      </ScrollView>
    );
  }

  // totalOrderValue = tổng giá trị đơn hàng (finalPriceOrder là source of truth cho tất cả display)
  const totalOrderValue = order.finalPriceOrder ?? order.productPayment?.expectedAmountVnd ?? 0;

  // Khi đơn đang chờ thanh toán tiền hàng, backend đôi khi trả paidAmountVnd sai → bắt buộc = 0.
  const isWaitingForProductPayment = ['CHO_THANH_TOAN', 'CHO_THANH_TOAN_DAU_GIA', 'CHUA_THANH_TOAN', 'WAITING_FOR_PAYMENT', 'PENDING'].includes(normalizeLabelKey(order.status));
  const paidProductAmount = isWaitingForProductPayment ? 0 : (order.productPayment?.paidAmountVnd ?? 0);

  const shippingAmountVnd =
    order.shippingPayment?.expectedAmountVnd ??
    order.shippingEstimation?.totalEstimatedFee ??
    order.estimatedShippingFee ??
    0;
  const matchedRoute = routes.find((route) => {
    const normalizedOrderRouteId = String(order.routeId ?? '').trim();
    const normalizedOrderRouteName = String(order.routeName ?? '').trim().toLowerCase();
    return (
      (normalizedOrderRouteId && String(route.routeId) === normalizedOrderRouteId) ||
      (normalizedOrderRouteName && route.routeName.trim().toLowerCase() === normalizedOrderRouteName)
    );
  });
  const routeCurrency =
    order.routeCurrency?.trim() ||
    order.currency?.trim() ||
    matchedRoute?.routeCurrency?.trim() ||
    inferCurrencyFromRouteName(order.routeName) ||
    inferCurrencyFromRouteName(matchedRoute?.routeName) ||
    null;
  const paymentSessions = order.paymentSessions?.length
    ? order.paymentSessions
    : order.paymentSession
      ? [order.paymentSession]
      : [];

  // Số tiền cần trả NGAY của đợt đang chờ — tính tại FE từ data có sẵn (không cần BE).
  const productOutstanding = order.productPayment
    ? (!isWaitingForProductPayment && order.productPayment.outstandingAmountVnd != null
        ? order.productPayment.outstandingAmountVnd
        : Math.max((order.productPayment.expectedAmountVnd ?? 0) - paidProductAmount, 0))
    : 0;
  const shippingOutstanding = order.shippingPayment
    ? (order.shippingPayment.outstandingAmountVnd ??
        Math.max((order.shippingPayment.expectedAmountVnd ?? 0) - (order.shippingPayment.paidAmountVnd ?? 0), 0))
    : 0;
  const hasPaymentInfo = Boolean(order.productPayment || order.shippingPayment);
  const isCancelled = ['CANCELLED', 'DA_HUY', 'YEU_CAU_HUY', 'FAILED'].includes(normalizeLabelKey(order.status));
  const pendingSessions = paymentSessions.filter((session) => isPendingSession(session.status));
  const settledSessions = paymentSessions.filter((session) => !isPendingSession(session.status));
  const shippingSessions = paymentSessions.filter(isShippingPaymentSession);
  const pendingNonShippingSessions = pendingSessions.filter((session) => !isShippingPaymentSession(session));
  const pendingShippingSessions = pendingSessions.filter(isShippingPaymentSession);
  const pendingProductSessions = pendingSessions.filter(isProductPaymentSession);
  const successfulShippingSessions = settledSessions.filter(
    (session) => isShippingPaymentSession(session) && isSuccessfulSession(session),
  );
  const successfulProductSessions = settledSessions.filter(
    (session) => isProductPaymentSession(session) && isSuccessfulSession(session),
  );
  const hasPendingShippingSession = pendingShippingSessions.length > 0;
  const hasPendingProductSession = pendingProductSessions.length > 0;
  const hasSuccessfulShippingSession = successfulShippingSessions.length > 0;
  const hasSuccessfulProductSession = successfulProductSessions.length > 0;
  const hasShippingSessions = shippingSessions.length > 0;
  const settledProductSessions = settledSessions.filter(isProductPaymentSession);
  const orderStatusKey = normalizeLabelKey(order.status);
  const resolvedProductPaid =
    (
      (
        !isWaitingForProductPayment &&
        order.productPayment?.isPaid === true &&
        productOutstanding <= 0
      ) ||
      hasSuccessfulProductSession
    ) && !(!hasSuccessfulProductSession && hasPendingProductSession);
  const resolvedShippingPaid =
    (
      (
        order.shippingPayment?.isPaid === true &&
        shippingOutstanding <= 0
      ) ||
      hasSuccessfulShippingSession ||
      ORDER_STATUSES_AFTER_SHIPPING_PAYMENT.has(orderStatusKey)
    ) && !(!hasSuccessfulShippingSession && !ORDER_STATUSES_AFTER_SHIPPING_PAYMENT.has(orderStatusKey) && hasPendingShippingSession);

  let payNow = 0;
  let payNowLabel = 'Số tiền cần thanh toán';
  if (!isCancelled && !resolvedProductPaid && productOutstanding > 0) {
    payNow = totalOrderValue;
    payNowLabel = 'Cần thanh toán tiền hàng';
  } else if (!isCancelled && !resolvedShippingPaid && shippingOutstanding > 0) {
    payNow = shippingOutstanding;
    payNowLabel = 'Cần thanh toán phí vận chuyển';
  }
  const hasPayNow = payNow > 0;

  // QR theo ngữ cảnh: đợt đang chờ hiện đầy đủ, đợt đã xong thu gọn.
  const productPaid = resolvedProductPaid;
  const shippingPaid = resolvedShippingPaid;

  // Hành trình: mặc định 2 bước mới nhất, có nút mở rộng.
  const reversedLogs = [...(order.processLogs ?? [])].reverse();
  const visibleLogs = timelineExpanded || reversedLogs.length <= 2 ? reversedLogs : reversedLogs.slice(0, 2);
  const staff: SupportStaff | null = order.staff ?? order.staffCs ?? null;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: contentPaddingTop },
          staff ? { paddingBottom: 96 } : null,
        ]}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refreshOrder()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.orderCode}>{order.orderCode}</Text>
            <StatusBadge status={order.status} />
          </View>
          <Text style={styles.orderType}>
            {orderTypeLabel(order.orderType)} • {formatDate(order.createdAt)}
          </Text>
          <View style={styles.totalContainer}>
            {hasPayNow ? (
              <>
                <Text style={styles.payNowLabel}>{payNowLabel}</Text>
                <Text style={styles.payNowValue}>{formatCurrency(payNow)}</Text>
                <Text style={styles.totalHint}>Tổng giá trị đơn: {formatCurrency(totalOrderValue)}</Text>
              </>
            ) : isCancelled ? (
              <>
                <Text style={styles.totalLabel}>Trạng thái</Text>
                <Text style={styles.paidValue}>Đơn đã hủy</Text>
                <Text style={styles.totalHint}>Tổng giá trị đơn: {formatCurrency(totalOrderValue)}</Text>
              </>
            ) : productPaid && shippingPaid ? (
              <>
                <Text style={styles.totalLabel}>Thanh toán</Text>
                <Text style={styles.paidValue}>Thanh toán hoàn tất</Text>
                <Text style={styles.totalHint}>Tổng giá trị đơn: {formatCurrency(totalOrderValue)}</Text>
              </>
            ) : productPaid ? (
              <>
                <Text style={styles.totalLabel}>Thanh toán</Text>
                <Text style={styles.paidValue2}>Tiền hàng đã trả · Chờ phí vận chuyển</Text>
                <Text style={styles.totalHint}>Tổng giá trị đơn: {formatCurrency(totalOrderValue)}</Text>
              </>
            ) : hasPaymentInfo ? (
              <>
                <Text style={styles.totalLabel}>Tổng giá trị đơn hàng</Text>
                <Text style={styles.totalMainValue}>{formatCurrency(totalOrderValue)}</Text>
              </>
            ) : (
              <>
                <Text style={styles.totalLabel}>Tổng giá trị đơn hàng</Text>
                <Text style={styles.totalMainValue}>{formatCurrency(totalOrderValue)}</Text>
              </>
            )}
          </View>

          {/* Milestone stepper — only when payment data exists */}
          {hasPaymentInfo && !isCancelled ? (
            <View style={styles.milestoneRow}>
              <View style={styles.milestoneStep}>
                {productPaid
                  ? <Feather name="check-circle" size={13} color={colors.successText} />
                  : <View style={[styles.milestoneDot, !productPaid && styles.milestoneDotActive]} />}
                <Text style={[styles.milestoneLabel, productPaid && styles.milestoneLabelDone]}>
                  Đợt 1: Tiền hàng
                </Text>
              </View>
              <Feather name="chevron-right" size={12} color={colors.textMuted} style={{ marginHorizontal: 4 }} />
              <View style={styles.milestoneStep}>
                {shippingPaid
                  ? <Feather name="check-circle" size={13} color={colors.successText} />
                  : <View style={[styles.milestoneDot, productPaid && !shippingPaid && styles.milestoneDotActive]} />}
                <Text style={[styles.milestoneLabel, shippingPaid && styles.milestoneLabelDone]}>
                  Đợt 2: Vận chuyển
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <Section title="Thanh toán" icon="credit-card">
          <AppCard style={styles.paymentSummary}>
            <InfoRow label="Tiền hàng dự kiến" value={formatCurrency(totalOrderValue)} />
            <InfoRow label="Đã thanh toán tiền hàng" value={formatCurrency(paidProductAmount)} />
            <InfoRow label="Phí vận chuyển dự kiến" value={formatCurrency(shippingAmountVnd)} />
            {order.orderType === 'DAU_GIA' && order.paymentAfterAuction ? (
              <InfoRow label="Thanh toán sau đấu giá" value={formatCurrency(order.paymentAfterAuction)} />
            ) : null}
          </AppCard>


          {pendingNonShippingSessions.length ? (
            pendingNonShippingSessions.map((session, index) => (
              <PaymentSessionCard key={sessionKey(session, index)} session={session} onViewImage={openImage} isPending />
            ))
          ) : !hasShippingSessions && !settledProductSessions.length ? (
            <Text style={styles.mutedText}>Không có khoản cần thanh toán.</Text>
          ) : null}

          {settledProductSessions.length ? (
            <View style={styles.settledGroup}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSettledGroupExpanded((prev) => !prev)}
                style={({ pressed }) => [styles.settledGroupToggle, pressed && styles.imagePressed]}
              >
                <Text style={styles.settledHeader}>Đợt 1: Tiền hàng</Text>
                <View style={styles.settledGroupMeta}>
                  <StatusBadge
                    status={productPaid ? 'DA_THANH_TOAN' : 'CHO_THANH_TOAN'}
                    label={productPaid ? 'Đã thanh toán tiền hàng' : 'Chờ thanh toán tiền hàng'}
                  />
                  <Feather
                    name={settledGroupExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </Pressable>

              {settledGroupExpanded ? (
                <View style={styles.settledGroupContent}>
                  <AppCard style={styles.productModuleCard}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setProductModuleExpanded((prev) => !prev)}
                      style={({ pressed }) => [styles.settledRow, pressed && styles.imagePressed]}
                    >
                      <Text style={styles.settledTitle} numberOfLines={1}>
                        Thanh toán đơn hàng
                      </Text>
                      <StatusBadge status={productPaid ? 'DA_THANH_TOAN' : 'CHO_THANH_TOAN'} />
                      <Feather name={productModuleExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                    </Pressable>

                    {productModuleExpanded ? (
                      <View style={styles.productModuleContent}>
                        {settledProductSessions.map((session, index) => (
                          <PaymentSessionCard
                            key={sessionKey(session, index)}
                            session={session}
                            onViewImage={openImage}
                            showHeader={false}
                            embedded
                          />
                        ))}
                        <PaymentBreakdownCard
                          order={order}
                          title="Chi tiết đơn hàng"
                          currencyOverride={routeCurrency}
                          embedded
                        />
                      </View>
                    ) : null}
                  </AppCard>
                </View>
              ) : null}
            </View>
          ) : null}

          {hasShippingSessions ? (
            <View style={styles.settledGroup}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShippingGroupExpanded((prev) => !prev)}
                style={({ pressed }) => [styles.settledGroupToggle, pressed && styles.imagePressed]}
              >
                <Text style={styles.settledHeader}>Đợt 2: Vận chuyển</Text>
                <View style={styles.settledGroupMeta}>
                  <StatusBadge
                    status={shippingPaid ? 'DA_THANH_TOAN_SHIP' : 'CHO_THANH_TOAN_SHIP'}
                    label={shippingPaid ? 'Đã thanh toán vận chuyển' : 'Chờ thanh toán vận chuyển'}
                  />
                  <Feather
                    name={shippingGroupExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </Pressable>

              {shippingGroupExpanded ? (
                <View style={styles.settledGroupContent}>
                  {shippingSessions.map((session, index) => (
                    <PaymentSessionCard
                      key={sessionKey(session, index)}
                      session={session}
                      onViewImage={openImage}
                      isPending={isPendingSession(session.status)}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
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
                    <Text style={styles.productBadgeText} numberOfLines={1}>
                      {link.productTypeName || 'Chung'}
                    </Text>
                  </View>
                  <StatusBadge status={link.status || link.orderStatus || ''} />
                </View>
                <Text style={styles.productName}>{link.productName || 'Sản phẩm chưa có tên'}</Text>
                {productImageUrl ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Xem ảnh ${link.productName || 'sản phẩm'}`}
                    onPress={() => openImage(productImageUrl)}
                    style={({ pressed }) => [styles.thumbRow, pressed && styles.imagePressed]}
                  >
                    <Image source={{ uri: productImageUrl }} style={styles.thumbImage} />
                    <View style={styles.thumbHint}>
                      <Feather name="maximize-2" size={14} color={colors.primaryDark} />
                      <Text style={styles.thumbHintText}>Xem ảnh chi tiết</Text>
                    </View>
                  </Pressable>
                ) : null}
                <InfoRow label="Số lượng" value={String(link.quantity ?? '---')} />
                <InfoRow label="Giá web" value={`${new Intl.NumberFormat('vi-VN').format(link.priceWeb ?? 0)}${routeCurrency ? ` ${routeCurrency}` : ''}`} />
                <InfoRow label="Ship web" value={`${new Intl.NumberFormat('vi-VN').format(link.shipWeb ?? 0)}${routeCurrency ? ` ${routeCurrency}` : ''}`} />
                {link.extraCharge ? <InfoRow label="Phụ thu" value={formatCurrency(link.extraCharge)} /> : null}
                <InfoRow label="Thành tiền" value={formatCurrency(link.finalPriceVnd ?? 0)} highlight />
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

        <Section title="Hành trình đơn hàng" icon="clock">
          <AppCard style={styles.journeyCard}>
            {reversedLogs.length === 0 ? (
              <EmptyState icon="clock" title="Chưa có cập nhật" />
            ) : (
              <>
                {visibleLogs.map((log, i, arr) => {
                  const isLast = i === arr.length - 1;
                  const isFirst = i === 0;
                  const logImages = getTimelineImageUrls(log, order.orderLinks);
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
                        {logImages.length ? (
                          <View style={styles.timelineImagesWrap}>
                            <View style={styles.timelineImagesRow}>
                              {logImages.map((url, imageIndex) => (
                                <Pressable
                                  key={`${log.logId}-${url}`}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Xem hình ảnh hành trình ${imageIndex + 1}`}
                                  onPress={() => openImage(url)}
                                  style={({ pressed }) => [
                                    styles.timelineImageButton,
                                    pressed && styles.imagePressed,
                                  ]}
                                >
                                  <Image source={{ uri: url }} style={styles.timelineImage} />
                                </Pressable>
                              ))}
                            </View>
                            <Text style={styles.timelineImageCount}>{logImages.length} hình ảnh</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
                {reversedLogs.length > 2 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setTimelineExpanded((prev) => !prev)}
                    style={({ pressed }) => [styles.timelineToggle, pressed && styles.imagePressed]}
                  >
                    <Text style={styles.timelineToggleText}>
                      {timelineExpanded ? 'Thu gọn' : `Xem toàn bộ hành trình (${reversedLogs.length} bước)`}
                    </Text>
                    <Feather name={timelineExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primaryDark} />
                  </Pressable>
                ) : null}
              </>
            )}
          </AppCard>
        </Section>
      </ScrollView>

      {staff ? <StaffBar staff={staff} /> : null}

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

function PaymentBreakdownCard({
  order,
  title = 'Chi tiết tính tiền hàng',
  currencyOverride,
  embedded = false,
}: {
  order: CustomerOrderDetail;
  title?: string;
  currencyOverride?: string | null;
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const links = order.orderLinks ?? [];
  const currency = currencyOverride?.trim() || order.routeCurrency?.trim() || order.currency?.trim() || null;
  const exchangeRate = order.exchangeRate ?? 0;
  const extraChargeTotal = links.reduce((s, l) => s + (l.extraCharge ?? 0), 0);
  const quantityCheckFee = order.quantityCheckFee ?? 0;
  const fmt = (v: number) => new Intl.NumberFormat('vi-VN').format(v);

  const calcApproxVnd = (link: CustomerOrderLink) =>
    exchangeRate > 0
      ? Math.ceil(
          ((link.priceWeb ?? 0) * (link.quantity ?? 0) + (link.shipWeb ?? 0)) *
            exchangeRate *
            (1 + (link.purchaseFee ?? 0) / 100),
        )
      : null;

  const hasData =
    links.length > 0 ||
    extraChargeTotal > 0 ||
    quantityCheckFee > 0 ||
    (order.insuranceFee ?? 0) > 0 ||
    (order.finalPriceOrder ?? 0) > 0;
  if (!hasData) return null;

  return (
    <AppCard style={[styles.breakdownCard, embedded && styles.breakdownCardEmbedded]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.breakdownHeader, pressed && styles.imagePressed]}
      >
        <Feather name="file-text" size={14} color={colors.primaryDark} />
        <Text style={styles.breakdownTitle}>{title}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      {open ? (
        <View style={styles.breakdownBody}>
          {links.map((link, i) => {
            const approxVnd = calcApproxVnd(link);
            return (
              <View key={link.orderLinkId} style={[styles.breakdownLinkBlock, i > 0 && styles.breakdownLinkBorder]}>
                {links.length > 1 && <Text style={styles.breakdownLinkLabel}>LINK {i + 1}</Text>}
                <BdRow
                  label="Sản phẩm"
                  value={link.productName ? `${link.productName}${link.website ? ` · ${link.website}` : ''}` : '-'}
                />
                <BdRow label="Số lượng" value={fmt(link.quantity ?? 0)} />
                <BdRow label="Giá web" value={`${fmt(link.priceWeb ?? 0)}${currency ? ` ${currency}` : ''}`} />
                <BdRow label="Ship web" value={`${fmt(link.shipWeb ?? 0)}${currency ? ` ${currency}` : ''}`} />
                <BdRow label="Phí mua hộ" value={`${link.purchaseFee ?? 0}%`} />
                {exchangeRate > 0 ? (
                  <BdRow
                    label="Tỉ giá"
                    value={currency ? `1 ${currency} = ${fmt(exchangeRate)} VND` : `${fmt(exchangeRate)} VND`}
                  />
                ) : null}
                {approxVnd != null && approxVnd > 0 ? (
                  <View style={styles.approxVndRow}>
                    <Text style={styles.approxVndKey}>≈ ~VND</Text>
                    <Text style={styles.approxVndVal}>{formatCurrency(approxVnd)}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          <View style={styles.breakdownSummary}>
            {extraChargeTotal > 0 ? (
              <BdRow label="Phụ phí" value={formatCurrency(extraChargeTotal)} valueColor={colors.successText} />
            ) : null}
            {quantityCheckFee > 0 ? (
              <BdRow label="Phí kiểm hàng" value={formatCurrency(quantityCheckFee)} valueColor={colors.successText} />
            ) : null}
            {order.insuranceFee ? (
              <BdRow label="Phí bảo hiểm" value={formatCurrency(order.insuranceFee)} valueColor={colors.successText} />
            ) : null}
            <View style={styles.breakdownTotalRow}>
              <Text style={styles.breakdownTotalLabel}>Thành tiền</Text>
              <Text style={styles.breakdownTotalVal}>{formatCurrency(order.finalPriceOrder ?? 0)}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </AppCard>
  );
}

function StaffBar({ staff }: { staff: SupportStaff }) {
  return (
    <View style={styles.staffBar}>
      <View style={styles.staffInfo}>
        <View style={styles.staffAvatar}>
          <Feather name="user" size={18} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.staffRole}>Nhân viên hỗ trợ</Text>
          <Text style={styles.staffName} numberOfLines={1}>
            {staff.name}{staff.phone ? ` · ${staff.phone}` : ''}
          </Text>
        </View>
      </View>
      {staff.phone ? (
        <Pressable
          style={styles.staffCallBtn}
          onPress={() => void Linking.openURL(`tel:${staff.phone}`)}
        >
          <Text style={styles.staffCallBtnText}>Liên hệ ngay</Text>
        </Pressable>
      ) : null}
    </View>
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

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.detailRow, highlight && styles.detailRowHighlight]}>
      <Text style={[styles.detailLabel, highlight && styles.detailLabelHighlight]}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>{value}</Text>
    </View>
  );
}

function BdRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.bdRow}>
      <Text style={styles.bdLabel}>{label}</Text>
      <Text style={[styles.bdValue, valueColor ? { color: valueColor } : null]} numberOfLines={3}>{value}</Text>
    </View>
  );
}

function PaymentSessionCard({
  session,
  onViewImage,
  isPending = false,
  showHeader = true,
  embedded = false,
}: {
  session: CustomerPaymentSession;
  onViewImage: (url: string) => void;
  isPending?: boolean;
  showHeader?: boolean;
  embedded?: boolean;
}) {
  const purposeLabel = isShippingPaymentSession(session)
    ? 'Thanh toán vận chuyển'
    : transactionPurposeLabel(session.purpose || session.paymentType);

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

      {/* Gray content box — mirrors the HTML mockup's bg-slate-50 container */}
      <View style={styles.paymentContentBox}>
        {/* Payment code row — tap to copy */}
        {session.paymentCode ? (
          <Pressable
            style={styles.paymentInfoRow}
            onPress={async () => {
              await Clipboard.setStringAsync(session.paymentCode || '');
              Toast.show({ type: 'success', text1: 'Đã copy mã thanh toán' });
            }}
          >
            <Text style={styles.paymentInfoLabel}>Mã thanh toán:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.paymentInfoValue}>{session.paymentCode}</Text>
              <Feather name="copy" size={11} color={colors.primaryDark} />
            </View>
          </Pressable>
        ) : null}

        {/* Amount row */}
        {session.amount != null ? (
          <View style={styles.paymentInfoRow}>
            <Text style={styles.paymentInfoLabel}>Số tiền chuyển khoản:</Text>
            <Text style={styles.paymentInfoValueBold}>{formatCurrency(session.amount)}</Text>
          </View>
        ) : null}

        {/* QR Code — always visible, amber border if pending */}
        {session.qrCode ? (
          <View style={[styles.qrCenterBox, isPending && styles.qrCenterBoxActive]}>
            <Pressable onPress={() => onViewImage(session.qrCode!)}>
              <Image
                source={{ uri: session.qrCode }}
                style={styles.qrImageSquare}
                resizeMode="contain"
              />
            </Pressable>
            <Text style={styles.qrCenterHint}>
              {isPending ? 'Nhấn để phóng to · Quét để thanh toán' : 'Nhấn để phóng to'}
            </Text>
          </View>
        ) : null}

        {/* Action buttons: Xem QR + Sao chép CK */}
        {(session.qrCode || session.content) ? (
          <View style={styles.qrBtnRow}>
            {session.qrCode ? (
              <Pressable
                style={styles.qrBtnPrimary}
                onPress={() => onViewImage(session.qrCode!)}
              >
                <Feather name="maximize-2" size={13} color={colors.black} />
                <Text style={styles.qrBtnText}>Xem QR</Text>
              </Pressable>
            ) : null}
            {session.content ? (
              <Pressable
                style={styles.qrBtnSecondary}
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

      {/* Bank info — outside the gray box */}
      {session.bankAccount ? (
        <View style={styles.bankBox}>
          <InfoRow label="Ngân hàng" value={session.bankAccount.bankName} />
          <InfoRow label="Số tài khoản" value={session.bankAccount.accountNumber} />
          <InfoRow label="Chủ tài khoản" value={session.bankAccount.accountHolder} />
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  errorHint: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing['4xl'],
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
  payNowLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.warning,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  payNowValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.warning,
  },
  paidValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.successText,
  },
  paidValue2: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primary,
  },
  totalMainValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
  },
  totalHint: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
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
  settledGroup: {
    marginTop: spacing.xs,
  },
  settledGroupToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  settledGroupContent: {
    marginTop: spacing.sm,
  },
  settledGroupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  productModuleCard: {
    marginBottom: 0,
  },
  productModuleContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  settledHeader: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  settledRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  settledTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
  },
  settledAmount: {
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textSecondary,
  },
  productCard: {
    marginBottom: spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  productBadge: {
    flexShrink: 1,
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
  thumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  thumbImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  thumbHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  thumbHintText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
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
  detailRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  detailLabelHighlight: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  detailValueHighlight: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
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
  timelineImagesWrap: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  timelineImagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timelineImageButton: {
    width: 92,
    height: 92,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  timelineImage: {
    width: '100%',
    height: '100%',
  },
  timelineImageCount: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  timelineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  timelineToggleText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  milestoneStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  milestoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  milestoneDotActive: {
    backgroundColor: colors.primary,
  },
  milestoneLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
    flexShrink: 1,
  },
  milestoneLabelDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  copyLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
    color: colors.textSecondary,
    marginBottom: 2,
  },
  sessionAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  sessionAmountLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
  },
  sessionAmountValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  qrToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryLight,
  },
  qrToggleBtnText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
  },
  staffBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.md,
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  staffRole: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  staffName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  staffCallBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  staffCallBtnText: {
    color: colors.black,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    fontSize: typography.fontSize.sm,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  paymentInfoValueBold: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
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
  },
  qrCenterHint: {
    fontSize: 10,
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
  breakdownCard: {
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  breakdownCardEmbedded: {
    marginBottom: 0,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  breakdownTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textPrimary,
  },
  breakdownBody: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  breakdownLinkBlock: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: '#F8FAFC',
  },
  breakdownLinkBorder: {
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
  },
  breakdownLinkLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: '#60A5FA',
    letterSpacing: 2,
    marginBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  approxVndRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  approxVndKey: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: fontFamilyForWeight('400'),
  },
  approxVndVal: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.successText,
  },
  breakdownSummary: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  breakdownTotalLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textPrimary,
  },
  breakdownTotalVal: {
    fontSize: typography.fontSize.md,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: '#1D4ED8',
  },
  bdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 6,
  },
  bdLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamilyForWeight('400'),
  },
  bdValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
});
