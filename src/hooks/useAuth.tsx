import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../utils/supabase/client';

// ✅ Get singleton Supabase client once at module level
const supabase = getSupabaseClient();

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // ✅ Initialize auth state from Supabase session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          console.log('✅ Found existing session');
          setIsAuthenticated(true);
          setCurrentUser(session.user);
          // Also store in localStorage for compatibility
          localStorage.setItem('supabase_access_token', session.access_token);
        } else {
          console.log('⚠️ No existing session');
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (user: any, token: string) => {
    console.log('✅ Login: Setting user and token');
    setIsAuthenticated(true);
    setCurrentUser(user);
    localStorage.setItem('supabase_access_token', token);
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('supabase_access_token');
  };

  const getAuthToken = () => {
    const token = localStorage.getItem('supabase_access_token');
    
    // ✅ 토큰이 없으면 null 반환 (publicAnonKey 반환하지 않음)
    if (!token) {
      console.warn('⚠️ No auth token available');
      return null;
    }
    
    // ✅ 토큰 앞부분만 로그 (보안)
    console.log('🔑 Using auth token:', token.substring(0, 20) + '...');
    return token;
  };

  return {
    isAuthenticated,
    currentUser,
    isInitializing,
    login,
    logout,
    getAuthToken,
    supabase, // ✅ Export supabase client for direct use
  };
}