import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  Restaurant,
  RestaurantMember,
  RestaurantSettings,
  RestaurantSubscription,
} from '@menuorbit/shared';

interface TenantContextType {
  restaurant: Restaurant | null;
  membership: RestaurantMember | null;
  settings: RestaurantSettings | null;
  subscription: RestaurantSubscription | null;
  loading: boolean;
  switchRestaurant: (restaurantId: string) => void;
  refreshTenant: () => Promise<void>;
  pauseOrdersForMinutes: (minutes: number | null) => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { memberships, loading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [subscription, setSubscription] = useState<RestaurantSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const activeMembership =
    memberships.find((m) => m.restaurant_id === selectedId) || memberships[0] || null;

  const fetchTenantDetails = async (restaurantId: string) => {
    setLoading(true);
    const [restRes, settingsRes, subRes] = await Promise.all([
      supabase.from('restaurants').select('*').eq('id', restaurantId).single(),
      supabase.from('restaurant_settings').select('*').eq('restaurant_id', restaurantId).single(),
      supabase
        .from('restaurant_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('restaurant_id', restaurantId)
        .single(),
    ]);

    if (restRes.data) setRestaurant(restRes.data as Restaurant);
    if (settingsRes.data) setSettings(settingsRes.data as RestaurantSettings);
    if (subRes.data) setSubscription(subRes.data as RestaurantSubscription);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!activeMembership) {
      setRestaurant(null);
      setSettings(null);
      setSubscription(null);
      setLoading(false);
      return;
    }
    fetchTenantDetails(activeMembership.restaurant_id);
  }, [authLoading, activeMembership?.restaurant_id]);

  const switchRestaurant = (restaurantId: string) => {
    setSelectedId(restaurantId);
  };

  const refreshTenant = async () => {
    if (activeMembership) {
      await fetchTenantDetails(activeMembership.restaurant_id);
    }
  };

  const pauseOrdersForMinutes = async (minutes: number | null) => {
    if (!restaurant) return;
    const pausedUntil =
      minutes === null ? null : new Date(Date.now() + minutes * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('restaurant_settings')
      .update({ orders_paused_until: pausedUntil })
      .eq('restaurant_id', restaurant.id);

    if (!error && settings) {
      setSettings({ ...settings, orders_paused_until: pausedUntil });
    }
  };

  return (
    <TenantContext.Provider
      value={{
        restaurant,
        membership: activeMembership,
        settings,
        subscription,
        loading,
        switchRestaurant,
        refreshTenant,
        pauseOrdersForMinutes,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside TenantProvider');
  return ctx;
}