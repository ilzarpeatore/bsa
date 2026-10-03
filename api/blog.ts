import apiClient from './client';

export interface BlogCategory {
  id: number;
  title: string;
  slug: string;
  post_count: number;
}

export interface BlogListItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  post_image: string;
  datetime: string;
  status: string;
  is_featured: boolean;
  blog_category_id: number | null;
  blog_category: { id: number; title: string; slug: string } | null;
  tags_name: { id: number; title: string }[];
  category_name: { id: number; title: string }[];
  created_at: string;
  updated_at: string;
}

export interface BlogDetailItem extends BlogListItem {
  bibliography: string;
}

export interface BlogListResponse {
  data: BlogListItem[];
  pagination: {
    total_items: number;
    per_page: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface BlogCategoryListResponse {
  data: BlogCategory[];
}

export const blogApi = {
  getList: (page: number = 1, params?: {
    search?: string;
    blog_category_id?: number;
    order_by?: string;
    order_dir?: string;
    per_page?: number;
    is_featured?: string;
  }) => {
    let url = `post-list?page=${page}&channel=app`;
    if (params?.search) url += `&search=${encodeURIComponent(params.search)}`;
    if (params?.blog_category_id) url += `&blog_category_id=${params.blog_category_id}`;
    if (params?.order_by) url += `&order_by=${params.order_by}`;
    if (params?.order_dir) url += `&order_dir=${params.order_dir}`;
    if (params?.per_page) url += `&per_page=${params.per_page}`;
    if (params?.is_featured) url += `&is_featured=${params.is_featured}`;
    return apiClient.get<BlogListResponse>(url);
  },

  getDetail: (id: number) =>
    apiClient.post<{ data: BlogDetailItem }>('post-detail', null, { params: { id } }),

  getCategories: () =>
    apiClient.get<BlogCategoryListResponse>('blog-category-list'),
};
