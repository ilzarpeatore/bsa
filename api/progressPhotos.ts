import apiClient from './client';
import { ApiMessageResponse } from './types';

// Fotos de progreso propias (antes/después). Backend: MyProgressPhotoController
// (bckbs, 2026-10-03). Las fotos viven en el disco privado del servidor y la
// `url` es una URL firmada que caduca a las 6 h -- no guardarla, volver a pedir
// la lista al abrir la pantalla.
export type ProgressPhotoPose = 'front' | 'side' | 'back' | 'other';

export const POSES: { key: Exclude<ProgressPhotoPose, 'other'>; label: string }[] = [
  { key: 'front', label: 'Frente' },
  { key: 'side', label: 'Perfil' },
  { key: 'back', label: 'Espalda' },
];

export const POSE_LABEL: Record<ProgressPhotoPose, string> = {
  front: 'Frente',
  side: 'Perfil',
  back: 'Espalda',
  other: 'Otra',
};

export interface ProgressPhoto {
  id: number;
  url: string;
  pose: ProgressPhotoPose;
  taken_at: string; // YYYY-MM-DD
  created_at: string;
}

export interface PhotoFile {
  uri: string;
  name?: string;
  type?: string;
}

export function toUploadFile(file: PhotoFile) {
  // React Native convierte { uri, name, type } en un fichero real del FormData.
  return {
    uri: file.uri,
    name: file.name || `progreso_${Date.now()}.jpg`,
    type: file.type || 'image/jpeg',
  } as unknown as Blob;
}

export const progressPhotosApi = {
  list: () => apiClient.get<{ data: ProgressPhoto[] }>('v1/my-progress-photos'),

  upload: (file: PhotoFile, pose: ProgressPhotoPose, takenAt?: string) => {
    const form = new FormData();
    form.append('photo', toUploadFile(file));
    form.append('pose', pose);
    if (takenAt) form.append('taken_at', takenAt);
    return apiClient.post<{ data: ProgressPhoto }>('v1/my-progress-photo-store', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  remove: (photoId: number) =>
    apiClient.post<ApiMessageResponse>('v1/my-progress-photo-delete', { photo_id: photoId }),
};
