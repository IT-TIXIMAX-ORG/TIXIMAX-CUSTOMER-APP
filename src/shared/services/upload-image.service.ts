import { Platform } from 'react-native';

import { ENV_CONFIG } from '@/src/shared/constants/env.constants';
import { readStoredToken } from '@/src/shared/lib/auth/auth-storage';
import { httpClient } from '@/src/shared/lib/http/http-client';

export interface UploadImageResult {
  id: string;
  url: string;
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const pickString = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const normalizeUploadResponse = (value: unknown): UploadImageResult => {
  const root = toRecord(value);
  const candidates = [root, toRecord(root.data), toRecord(root.result), toRecord(root.content)];
  for (const candidate of candidates) {
    const id = pickString(candidate, ['id', 'mediaId', 'fileId', '_id']);
    const url = pickString(candidate, ['url', 'imageUrl', 'publicUrl', 'secureUrl', 'fileUrl', 'path']);
    if (id) return { id, url };
  }
  throw new Error('Upload response does not include an image id.');
};

const mimeToExtension = (mimeType: string) => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'jpg';
};

const inferMimeType = (fileName: string, fallback?: string) => {
  if (fallback?.startsWith('image/')) return fallback;
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return 'image/jpeg';
};

const inferFileName = (uri: string, mimeType: string) => {
  const cleanUri = uri.split('?')[0]?.split('#')[0] ?? uri;
  const rawName = cleanUri.split('/').pop();
  const decodedName = rawName ? decodeURIComponent(rawName) : '';
  if (decodedName && decodedName.includes('.')) return decodedName;
  return `image-${Date.now()}.${mimeToExtension(mimeType)}`;
};

const buildApiUrl = (path: string) =>
  `${ENV_CONFIG.apiBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

const readErrorMessage = (value: unknown) => {
  const data = toRecord(value);
  const details = Array.isArray(data.details) ? data.details : [];
  const detailMessage = toRecord(details[0]).message;
  return pickString(data, ['message', 'error']) || (typeof detailMessage === 'string' ? detailMessage : '');
};

const appendImageToFormData = async (formData: FormData, uri: string): Promise<void> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Could not read the selected image file.');
    }

    const blob = await response.blob();
    const type = inferMimeType(uri, blob.type);
    const name = inferFileName(uri, type);
    const file = typeof File === 'function' ? new File([blob], name, { type }) : blob;
    formData.append('file', file, name);
    return;
  }

  const type = inferMimeType(uri);
  const name = inferFileName(uri, type);
  formData.append('file', { uri, name, type } as unknown as Blob);
};

export const uploadImageUri = async (uri: string, folder = 'orders'): Promise<UploadImageResult> => {
  const formData = new FormData();
  await appendImageToFormData(formData, uri);

  const token = readStoredToken();
  const response = await fetch(buildApiUrl(`/media/${folder}`), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(readErrorMessage(data) || 'Image upload failed.');
  }

  return normalizeUploadResponse(data);
};

export const deleteImageFile = async (id: string, folder?: string): Promise<void> => {
  const path = folder ? `/media/${folder}/${id}` : `/media/${id}`;
  await httpClient.delete(path);
};
