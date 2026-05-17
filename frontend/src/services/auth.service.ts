import apiClient from './api';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: Partial<User> & { password: string }): Promise<{ user: User }> => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  updateMe: async (updates: Partial<User>): Promise<User> => {
    const response = await apiClient.put('/auth/me', updates);
    return response.data;
  },

  getUsers: async (): Promise<{ users: User[] }> => {
    const response = await apiClient.get('/auth/users');
    return response.data;
  },
};
