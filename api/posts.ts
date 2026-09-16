import apiClient from './client';
import { ApiMessageResponse } from './types';

export interface PostData {
  id: number;
  description: string;
  status: string;
  user_id: number;
  posting_media_array: {
    id: number;
    posting_id: number;
    media_url: string;
    media_type: string;
  }[];
  users: {
    id: number;
    first_name: string;
    last_name: string;
    display_name: string;
    email: string;
    profile_image: string;
  };
  posting_like_count: number;
  posting_comment_count: number;
  can_edit: boolean;
  is_liked: boolean;
  is_bookmark: boolean;
  created_at: string;
}

export interface PostListResponse {
  data: PostData[];
  pagination: {
    total_items: number;
    per_page: number;
    // El backend (json_pagination_response en app/Helpers/helper.php) devuelve
    // estas dos claves en camelCase, no snake_case como el resto del payload.
    currentPage: number;
    totalPages: number;
  };
}

export interface PostComment {
  id: number;
  comment: string;
  user_id: number;
  posting_id: number;
  users: {
    id: number;
    first_name: string;
    last_name: string;
    display_name: string;
    profile_image: string;
  };
  created_at: string;
}

export interface PickedPostMedia {
  uri: string;
  name: string;
  type: string;
}

function buildPostFormData(description: string, media: PickedPostMedia[], extra?: Record<string, string | number>) {
  const formData = new FormData();
  formData.append('description', description);
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => formData.append(key, String(value)));
  }
  media.forEach((m) => {
    // El backend (UserPostingRequest) espera un array de ficheros en
    // "posting_media" - React Native infla el objeto { uri, name, type } a un
    // fichero real dentro del FormData multipart.
    formData.append('posting_media[]', { uri: m.uri, name: m.name, type: m.type } as any);
  });
  return formData;
}

export const postsApi = {
  getList: (page: number = 1, userId?: number) =>
    apiClient.get<PostListResponse>(`userpost-list?page=${page}${userId ? `&user_id=${userId}` : ''}`),

  getDetail: (postId: number) =>
    apiClient.get<{ data: PostData }>(`userpost-detail?id=${postId}`),

  like: (postId: number) =>
    apiClient.post<ApiMessageResponse>('like-userpost', { posting_id: postId }),

  bookmark: (postId: number) =>
    apiClient.post<ApiMessageResponse>('bookmark-userpost', { posting_id: postId }),

  saveComment: (postId: number, comment: string) =>
    apiClient.post<ApiMessageResponse>('save-comment', { posting_id: postId, comment }),

  getComments: (postId: number, page: number = 1) =>
    apiClient.get<{ data: PostComment[] }>(`comment-list?posting_id=${postId}&page=${page}`),

  deletePost: (postId: number) =>
    apiClient.post<ApiMessageResponse>('delete-userpost', { id: postId }),

  report: (postId: number, reason: string) =>
    apiClient.post<ApiMessageResponse>('report-on-posting', { posting_id: postId, reason }),

  reportComment: (commentId: number, reason: string) =>
    apiClient.post<ApiMessageResponse>('report-on-comment', { comment_id: commentId, reason }),

  getBookmarks: (page: number = 1) =>
    apiClient.get<PostListResponse>(`my-bookmark-post-list?page=${page}`),

  create: (description: string, media: PickedPostMedia[] = []) => {
    if (media.length === 0) {
      return apiClient.post<ApiMessageResponse>('save-userpost', { description });
    }
    return apiClient.post<ApiMessageResponse>('save-userpost', buildPostFormData(description, media), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: (postId: number, description: string, media: PickedPostMedia[] = []) => {
    if (media.length === 0) {
      return apiClient.post<ApiMessageResponse>('update-userpost', { id: postId, description });
    }
    return apiClient.post<ApiMessageResponse>(
      'update-userpost',
      buildPostFormData(description, media, { id: postId }),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  removeMedia: (postId: number, mediaIds: number[]) =>
    apiClient.post<ApiMessageResponse>('remove-userpost-media', { posting_id: postId, ids: mediaIds }),
};
