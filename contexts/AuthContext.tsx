import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User, AuthState } from '@/types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const setSession = (session: Session | null) => {
    if (session?.user) {
      const user: User = {
        id: session.user.id,
        email: session.user.email!,
        display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
        avatar_url: session.user.user_metadata?.avatar_url,
        created_at: session.user.created_at,
      };
      
      setState({
        user,
        loading: false,
        isAuthenticated: true,
      });
    } else {
      setState({
        user: null,
        loading: false,
        isAuthenticated: false,
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      console.log('Sign in response:', { data: data?.user?.email, error });
      
      if (error) {
        console.error('Sign in error:', error);
        return { error: error.message };
      }
      
      return {};
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { error: 'An unexpected error occurred during sign in' };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign up with email:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      
      console.log('Sign up response:', { data: data?.user?.email, error });
      
      if (error) {
        console.error('Sign up error:', error);
        return { error: error.message };
      }
      
      return {};
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      return { error: 'An unexpected error occurred during sign up' };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      
      // Set loading state to show feedback
      setState(prev => ({ ...prev, loading: true }));
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        // Reset loading state on error
        setState(prev => ({ ...prev, loading: false }));
        throw new Error(error.message);
      }
      
      console.log('Sign out successful');
      
      // Clear state immediately after successful sign out
      setState({
        user: null,
        loading: false,
        isAuthenticated: false,
      });
      
    } catch (error) {
      console.error('Unexpected sign out error:', error);
      // Reset loading state and re-throw error
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Resetting password for email:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'pikycart://reset-password',
      });
      
      if (error) {
        console.error('Reset password error:', error);
        return { error: error.message };
      }
      
      return {};
    } catch (error) {
      console.error('Unexpected reset password error:', error);
      return { error: 'An unexpected error occurred during password reset' };
    }
  };

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}