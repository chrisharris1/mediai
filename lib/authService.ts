// Get base URL - works in both client and server
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return ''; // Client-side: use relative URLs
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL; // Server-side: use full URL
  }
  return 'http://localhost:3001'; // Fallback
};

const API_URL = `${getBaseUrl()}/api/auth`;

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  access_token?: string;
  user?: User;
  user_id?: string;
}

export const authService = {
  register: async (email: string, password: string, fullName: string, role = 'patient'): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, role }),
      });
      
      const data = await response.json();
      
      // Auto-login after successful registration
      if (data.success && data.access_token && data.user && typeof window !== 'undefined') {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      if (data.success && data.access_token && data.user && typeof window !== 'undefined') {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  getProfile: async (): Promise<AuthResponse> => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        throw new Error('No token found');
      }
      
      const response = await fetch(`${API_URL}/me`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      return await response.json();
    } catch (error: any) {
      console.error('Get profile error:', error);
      return { success: false, message: error.message };
    }
  },

  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    // Optional: Verify token hasn't expired (basic check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  },

  // OAuth registration/login
  oauthLogin: async (provider: string, email: string, fullName: string, oauthId: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/oauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider, 
          email, 
          full_name: fullName, 
          oauth_id: oauthId 
        }),
      });
      
      const data = await response.json();
      
      // Store token and user data
      if (data.success && data.access_token && data.user && typeof window !== 'undefined') {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      console.error('OAuth login error:', error);
      return { success: false, message: 'OAuth authentication failed.' };
    }
  }
};