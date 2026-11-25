import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, RestaurantMember } from '@menuorbit/shared';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  memberships: RestaurantMember[];
  loading: boolean;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<RestaurantMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserDetails = async (userId: string) => {
    const [profileRes, memberRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('restaurant_members')
        .select('*, restaurants(*)')
        .eq('user_id', userId)
        .eq('is_active', true),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data as Profile);
    }
    if (memberRes.data) {
      setMemberships(memberRes.data as RestaurantMember[]);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        loadUserDetails(currentSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setLoading(true);
        loadUserDetails(newSession.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setMemberships([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUserData = async () => {
    if (session?.user) {
      await loadUserDetails(session.user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setMemberships([]);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        memberships,
        loading,
        refreshUserData,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

