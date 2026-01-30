import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

export interface UserProfile {
    id: string;
    company_name: string | null;
    company_website: string | null;
    competitor_names: string[] | null;
    product_description: string | null;
    selling_proposition: string | null;
    onboarding_complete: boolean | null;
    onboarding_data: OnboardingData | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface OnboardingData {
    productDescription?: string;
    companyName?: string;
    companyDomain?: string;
    region?: string;
    states?: string[];
    cities?: string[];
    territoryDescription?: string;
    isCustomTerritory?: boolean;
    targetCategories?: string[];
    competitors?: string[];
    suggestedCompetitors?: string[];
    targetAccount?: string;
    additionalContext?: string;
    email?: string;
}

export function useUserProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!user) {
            setProfile(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError) {
                // If profile doesn't exist, that's okay - user might be new
                if (fetchError.code === 'PGRST116') {
                    setProfile(null);
                } else {
                    throw fetchError;
                }
            } else {
                // Parse onboarding_data from Json to typed object
                const parsedProfile: UserProfile = {
                    ...data,
                    onboarding_data: data.onboarding_data as OnboardingData | null,
                };
                setProfile(parsedProfile);
            }
        } catch (err) {
            console.error('Error fetching user profile:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
        } finally {
            setLoading(false);
        }
    }, [user]);

    const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
        if (!user) {
            throw new Error('No user logged in');
        }

        try {
            // Convert onboarding_data back to Json type for Supabase
            const dbUpdates: Record<string, unknown> = { ...updates };
            if (updates.onboarding_data !== undefined) {
                dbUpdates.onboarding_data = updates.onboarding_data as unknown as Json;
            }

            const { data, error: updateError } = await supabase
                .from('profiles')
                .update({
                    ...dbUpdates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)
                .select()
                .single();

            if (updateError) {
                throw updateError;
            }

            const parsedProfile: UserProfile = {
                ...data,
                onboarding_data: data.onboarding_data as OnboardingData | null,
            };
            setProfile(parsedProfile);
            return parsedProfile;
        } catch (err) {
            console.error('Error updating user profile:', err);
            throw err instanceof Error ? err : new Error('Failed to update profile');
        }
    }, [user]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return {
        profile,
        loading,
        error,
        refetch: fetchProfile,
        updateProfile,
    };
}
