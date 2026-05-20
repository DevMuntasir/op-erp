import axios from 'axios';
import { auth } from '@/src/lib/firebase';
import { ApiClientError, ApiFailure, ApiResponse } from '@/src/shared/types/api';

export const apiClient = axios.create({
  baseURL: 'https://op-media-backend.vercel.app',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const failure = error?.response?.data as ApiFailure | undefined;
    throw new ApiClientError(failure?.error?.message || error.message || 'Request failed', {
      code: failure?.error?.code,
      status: error?.response?.status ?? 500,
      details: failure?.error?.details,
      requestId: failure?.meta?.requestId,
    });
  },
);

export async function getApiData<T>(url: string, params?: Record<string, unknown>) {
  const response = await apiClient.get<ApiResponse<T>>(url, { params });
  const payload = response.data;
  if ('error' in payload) {
    throw new ApiClientError(payload.error.message, {
      code: payload.error.code,
      details: payload.error.details,
      requestId: payload.meta.requestId,
      status: response.status,
    });
  }
  return payload.data;
}

export async function postApiData<TResponse, TBody = unknown>(url: string, body?: TBody) {
  const response = await apiClient.post<ApiResponse<TResponse>>(url, body);
  const payload = response.data;
  if ('error' in payload) {
    throw new ApiClientError(payload.error.message, {
      code: payload.error.code,
      details: payload.error.details,
      requestId: payload.meta.requestId,
      status: response.status,
    });
  }
  return payload.data;
}

export async function patchApiData<TResponse, TBody = unknown>(url: string, body: TBody) {
  const response = await apiClient.patch<ApiResponse<TResponse>>(url, body);
  const payload = response.data;
  if ('error' in payload) {
    throw new ApiClientError(payload.error.message, {
      code: payload.error.code,
      details: payload.error.details,
      requestId: payload.meta.requestId,
      status: response.status,
    });
  }
  return payload.data;
}

export async function deleteApiData<TResponse>(url: string) {
  const response = await apiClient.delete<ApiResponse<TResponse>>(url);
  const payload = response.data;
  if ('error' in payload) {
    throw new ApiClientError(payload.error.message, {
      code: payload.error.code,
      details: payload.error.details,
      requestId: payload.meta.requestId,
      status: response.status,
    });
  }
  return payload.data;
}
