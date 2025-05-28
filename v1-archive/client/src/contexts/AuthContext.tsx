import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { pb } from '../services/pocketbase';
import type { AuthModel } from 'pocketbase';

interface AuthContextType {
  user: AuthModel | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, passwordConfirm: string, name?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authData = pb.authStore.model;
    if (authData) {
      setUser(authData);
    }
    setIsLoading(false);

    // Listen for auth changes
    pb.authStore.onChange((_token, model) => {
      setUser(model);
    });
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      setUser(authData.record);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (
    email: string, 
    password: string, 
    passwordConfirm: string,
    name?: string
  ): Promise<void> => {
    try {
      // Create user account
      const userData = {
        email,
        password,
        passwordConfirm,
        name: name || email.split('@')[0], // Use part before @ as default name
        emailVisibility: false
      };

      await pb.collection('users').create(userData);
      
      // Automatically log in after registration
      await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = (): void => {
    pb.authStore.clear();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}