import type { ReactNode } from 'react';
import { useEffect, useState } from "react";
import pb from '../../lib/pocketbase';
import type { User } from "../types";
import { AuthContext } from "./AuthContext";

const isUser = (record: unknown): record is User => {
  if (!record || typeof record !== 'object') return false;
  
  const rec = record as { [key: string]: unknown };
  
  return (
    typeof rec.id === 'string' && 
    typeof rec.email === 'string' &&
    typeof rec.verified === 'boolean'
  );
};

const toUser = (record: unknown): User | null => {
  if (!isUser(record)) return null;
  return record;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => toUser(pb.authStore.record));
    const [loading, setLoading] = useState(false);
  
    useEffect(() => {
      const unsubscribe = pb.authStore.onChange(() => {
        const newUser = toUser(pb.authStore.record);
        setUser(newUser);
        // Clear loading state when auth state changes
        if (newUser) {
          setLoading(false);
        }
      });
  
      return unsubscribe;
    }, []);
  
    const login = async (email: string, password: string) => {
      setLoading(true);
      try {
        const authData = await pb.collection('users').authWithPassword(email, password);
        setUser(toUser(authData.record));
      } finally {
        setLoading(false);
      }
    };

    const signup = async (email: string, password: string, username: string) => {
      setLoading(true);
      try {
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
          username,
        });
        
        const authData = await pb.collection('users').authWithPassword(email, password);
        const newUser = toUser(authData.record);
        setUser(newUser);

        // Create default free subscription for new user
        if (newUser) {
          try {
            const now = new Date();
            const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            
            await pb.collection('subscriptions').create({
              userId: newUser.id,
              tier: 'free',
              status: 'active',
              cancelAtPeriodEnd: false,
              pmgFetchesUsed: 0,
              aiExtractionsUsed: 0,
              usagePeriodStart: now.toISOString().split('T')[0],
              usagePeriodEnd: periodEnd.toISOString().split('T')[0],
            });
          } catch (subscriptionError) {
            // Log but don't fail signup if subscription creation fails
            // It will be created on first usage check or can be created manually
            console.warn('Failed to create subscription on signup:', subscriptionError);
          }
        }
      } finally {
        setLoading(false);
      }
    };
  
    const logout = () => {
      pb.authStore.clear();
      setUser(null);
    };
  
    const loginWithOAuth = (provider: string): Promise<void> => {
      setLoading(true);
      
      // All-in-One OAuth flow - matches PocketBase docs exactly
      // This method initializes a one-off realtime subscription and will
      // open a popup window with the OAuth2 vendor page to authenticate.
      // Once the external OAuth2 sign-in/sign-up flow is completed, the popup
      // window will be automatically closed and the OAuth2 data sent back
      // to the user through the previously established realtime connection.
      return pb.collection('users').authWithOAuth2({
        provider: provider,
      }).then(async () => {
        // authStore.onChange listener will automatically update user state and clear loading
        // But also check immediately and clear loading as a fallback
        const currentUser = toUser(pb.authStore.record);
        if (currentUser) {
          setUser(currentUser);
          
          // Create default free subscription for new OAuth user (if doesn't exist)
          try {
            const existingSubscriptions = await pb.collection('subscriptions').getFullList({
              filter: `userId = "${currentUser.id}"`,
            });
            
            if (existingSubscriptions.length === 0) {
              const now = new Date();
              const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
              
              await pb.collection('subscriptions').create({
                userId: currentUser.id,
                tier: 'free',
                status: 'active',
                cancelAtPeriodEnd: false,
                pmgFetchesUsed: 0,
                aiExtractionsUsed: 0,
                usagePeriodStart: now.toISOString().split('T')[0],
                usagePeriodEnd: periodEnd.toISOString().split('T')[0],
              });
            }
          } catch (subscriptionError) {
            // Log but don't fail OAuth if subscription creation fails
            console.warn('Failed to create subscription on OAuth signup:', subscriptionError);
          }
          
          setLoading(false);
        } else {
          // If user not immediately available, wait a bit for onChange to fire
          setTimeout(() => {
            setLoading(false);
          }, 500);
        }
      }).catch((error) => {
        console.error('OAuth error:', error);
        
        // Log detailed error information
        if (error && typeof error === 'object' && 'response' in error) {
          const err = error as { response?: { data?: unknown; code?: number; message?: string } };
          console.error('OAuth error response:', err.response);
          if (err.response?.data) {
            console.error('OAuth error data:', JSON.stringify(err.response.data, null, 2));
          }
        }
        
        setLoading(false);
        throw error;
      });
    };
  
    const updateUser = (updatedUser: User) => {
      setUser(updatedUser);
    };

    return (
      <AuthContext.Provider value={{ user, loading, login, signup, logout, loginWithOAuth, updateUser }}>
        {children}
      </AuthContext.Provider>
    );
  }