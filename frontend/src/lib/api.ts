import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';

// Types
import type { 
  ApiResponse, 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest,
  CreatePostRequest,
  UpdatePostRequest,
  MediaUploadResponse,
  AnalyticsRequest,
  AIGenerateRequest,
  AIGenerateResponse,
  SocialAccountConnectRequest,
  TeamInviteRequest,
  WebhookRequest,
  BulkActionRequest,
  SearchRequest,
  ExportRequest
} from '@/types/api';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add tenant ID if available
        const tenantId = this.getTenantId();
        if (tenantId) {
          config.headers['X-Tenant-ID'] = tenantId;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private getTenantId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tenant_id');
  }

  private handleError(error: any) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          this.clearAuth();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          break;
        case 403:
          toast.error('Access denied. You don\'t have permission to perform this action.');
          break;
        case 404:
          toast.error('Resource not found.');
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(data?.message || 'An unexpected error occurred.');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }
  }

  private clearAuth() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('user_data');
    }
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request<ApiResponse<T>>(config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Authentication endpoints
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>({
      method: 'POST',
      url: '/auth/login',
      data,
    });
    
    if (response.success && response.data) {
      // Store auth data
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', response.data.access_token);
        localStorage.setItem('tenant_id', response.data.tenant.id);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
      }
    }
    
    return response.data!;
  }

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>({
      method: 'POST',
      url: '/auth/register',
      data,
    });
    
    if (response.success && response.data) {
      // Store auth data
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', response.data.access_token);
        localStorage.setItem('tenant_id', response.data.tenant.id);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
      }
    }
    
    return response.data!;
  }

  async logout(): Promise<void> {
    this.clearAuth();
  }

  async getProfile(): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/auth/profile',
    });
    return response.data;
  }

  // Content endpoints
  async getPosts(params?: any): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/posts',
      params,
    });
    return response.data;
  }

  async createPost(data: CreatePostRequest): Promise<any> {
    const response = await this.request({
      method: 'POST',
      url: '/posts',
      data,
    });
    return response.data;
  }

  async updatePost(data: UpdatePostRequest): Promise<any> {
    const response = await this.request({
      method: 'PATCH',
      url: `/posts/${data.id}`,
      data,
    });
    return response.data;
  }

  async deletePost(id: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/posts/${id}`,
    });
  }

  async publishPost(id: string): Promise<any> {
    const response = await this.request({
      method: 'POST',
      url: `/posts/${id}/publish`,
    });
    return response.data;
  }

  // Media endpoints
  async uploadMedia(file: File, folder?: string): Promise<MediaUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = folder ? `/media/upload/${folder}` : '/media/upload';
    
    const response = await this.request<MediaUploadResponse>({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data!;
  }

  async deleteMedia(key: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/media/${key}`,
    });
  }

  async getMediaLibrary(params?: any): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/media',
      params,
    });
    return response.data;
  }

  // Analytics endpoints
  async getAnalytics(params: AnalyticsRequest): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/analytics',
      params,
    });
    return response.data;
  }

  async getPlatformAnalytics(platform: string, params?: any): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: `/analytics/platforms/${platform}`,
      params,
    });
    return response.data;
  }

  async getCompetitorAnalytics(params?: any): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/analytics/competitors',
      params,
    });
    return response.data;
  }

  // AI endpoints
  async generateContent(data: AIGenerateRequest): Promise<AIGenerateResponse> {
    const response = await this.request<AIGenerateResponse>({
      method: 'POST',
      url: '/ai/generate',
      data,
    });
    return response.data!;
  }

  async getAIAgents(): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/ai/agents',
    });
    return response.data;
  }

  async updateAIAgent(id: string, data: any): Promise<any> {
    const response = await this.request({
      method: 'PATCH',
      url: `/ai/agents/${id}`,
      data,
    });
    return response.data;
  }

  async getAIUsage(): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/ai/usage',
    });
    return response.data;
  }

  // Social accounts endpoints
  async getSocialAccounts(): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/social-accounts',
    });
    return response.data;
  }

  async connectSocialAccount(data: SocialAccountConnectRequest): Promise<any> {
    const response = await this.request({
      method: 'POST',
      url: '/social-accounts/connect',
      data,
    });
    return response.data;
  }

  async disconnectSocialAccount(id: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/social-accounts/${id}`,
    });
  }

  // Inbox endpoints
  async getConversations(params?: any): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/inbox/conversations',
      params,
    });
    return response.data;
  }

  async getMessages(conversationId: string, params?: any): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: `/inbox/conversations/${conversationId}/messages`,
      params,
    });
    return response.data;
  }

  async sendMessage(conversationId: string, data: any): Promise<any> {
    const response = await this.request({
      method: 'POST',
      url: `/inbox/conversations/${conversationId}/messages`,
      data,
    });
    return response.data;
  }

  // Team endpoints
  async getTeamMembers(): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/team/members',
    });
    return response.data;
  }

  async inviteTeamMember(data: TeamInviteRequest): Promise<any> {
    const response = await this.request({
      method: 'POST',
      url: '/team/invite',
      data,
    });
    return response.data;
  }

  async removeTeamMember(id: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/team/members/${id}`,
    });
  }

  // Settings endpoints
  async getSettings(): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/settings',
    });
    return response.data;
  }

  async updateSettings(data: any): Promise<any> {
    const response = await this.request({
      method: 'PATCH',
      url: '/settings',
      data,
    });
    return response.data;
  }

  // Webhooks endpoints
  async getWebhooks(): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/webhooks',
    });
    return response.data;
  }

  async createWebhook(data: WebhookRequest): Promise<any> {
    const response = await this.request({
      method: 'POST',
      url: '/webhooks',
      data,
    });
    return response.data;
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/webhooks/${id}`,
    });
  }

  // Bulk actions
  async bulkAction(data: BulkActionRequest): Promise<any> {
    const response = await this.request({
      method: 'POST',
      url: '/bulk-actions',
      data,
    });
    return response.data;
  }

  // Search
  async search(params: SearchRequest): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/search',
      params,
    });
    return response.data;
  }

  // Export
  async exportData(data: ExportRequest): Promise<Blob> {
    const response = await this.client.request({
      method: 'POST',
      url: '/export',
      data,
      responseType: 'blob',
    });
    return response.data;
  }

  // Notifications
  async getNotifications(params?: any): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: '/notifications',
      params,
    });
    return response.data;
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.request({
      method: 'PATCH',
      url: `/notifications/${id}/read`,
    });
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.request({
      method: 'PATCH',
      url: '/notifications/read-all',
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export default
export default apiClient;