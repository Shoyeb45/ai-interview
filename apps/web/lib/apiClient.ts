import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL!; // Ensure no trailing spaces!

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  data: T,
  success: true,
  message: string
}

class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedRequestsQueue: Array<(token: string) => void> = [];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  public setTokens(tokens: Tokens): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${API_BASE_URL}/auth/token/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const { accessToken, refreshToken: newRefreshToken = refreshToken } = response.data;
      this.setTokens({accessToken, refreshToken: newRefreshToken});
      return accessToken;
    } catch (error) {
      this.clearTokens();
      window.location.href = '/'; // Redirect to login
      throw error;
    }
  }

  private setupInterceptors(): void {
    // Request interceptor: add auth header
    this.axiosInstance.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor: handle 401 and token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for refresh to complete
            return new Promise((resolve) => {
              this.failedRequestsQueue.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.axiosInstance(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshAccessToken();
            this.isRefreshing = false;

            // Resolve queued requests
            this.failedRequestsQueue.forEach((callback) => callback(newToken));
            this.failedRequestsQueue = [];

            // Retry original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            this.isRefreshing = false;
            this.failedRequestsQueue = [];
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Public API methods — fully typed
  public async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.get<ApiResponse<T>>(url, config).then((res) => res.data?.data);
  }

  public async post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.post<ApiResponse<T>>(url, data, config).then((res) => res.data.data);
  }

  public async put<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.put<T>(url, data, config).then((res) => res.data);
  }

  public async patch<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.patch<ApiResponse<T>>(url, data, config).then((res) => res.data?.data);
  }

  public async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.delete<T>(url, config).then((res) => res.data);
  }
}

// Singleton instance
const apiClient = new ApiClient();


export default apiClient;