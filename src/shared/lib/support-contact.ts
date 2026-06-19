import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';

import { SUPPORT_STAFF_PHONE, SUPPORT_ZALO_URL } from '@/src/shared/constants/support';

const openSupportUrl = async (url: string, fallbackMessage: string) => {
  try {
    await Linking.openURL(url);
  } catch {
    Toast.show({ type: 'error', text1: fallbackMessage });
  }
};

export const openSupportPhone = () =>
  openSupportUrl(`tel:${SUPPORT_STAFF_PHONE}`, 'Không mở được trình gọi điện');

export const openSupportZalo = () =>
  openSupportUrl(SUPPORT_ZALO_URL, 'Không mở được Zalo');
