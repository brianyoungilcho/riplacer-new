import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

export interface DiscoverySession {
    id: string;
    user_id: string | null;
    criteria: DiscoveryCriteria;
    criteria_hash: string;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface DiscoveryCriteria {
    productDescription?: string;
    competitors?: string[];
    targetCategories?: string[];
    states?: string[];
    cities?: string[];
    region?: string;
    [key: string]: unknown;
}

export interface ProspectDossier {
    id: string;
    session_id: string;
    prospect_key: string;
    prospect_name: string;
    prospect_state: string | null;
    prospect_lat: number | null;
    prospect_lng: number | null;
    dossier: Record<string, unknown> | null;
    sources: unknown[] | null;
    status: string | null;
    created_at: string | null;
    last_updated: string | null;
}

export interface UserReport {
    session: DiscoverySession;
    dossiers: ProspectDossier[];
}

export function useUserReports() {
    const { user } = useAuth();
    const [reports, setReports] = useState<UserReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchReports = useCallback(async () => {
        if (!user) {
            setReports([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch all discovery sessions for this user
            const { data: sessions, error: sessionsError } = await supabase
                .from('discovery_sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (sessionsError) {
                throw sessionsError;
            }

            if (!sessions || sessions.length === 0) {
                setReports([]);
                setLoading(false);
                return;
            }

            // Fetch all prospect dossiers for these sessions
            const sessionIds = sessions.map(s => s.id);
            const { data: dossiers, error: dossiersError } = await supabase
                .from('prospect_dossiers')
                .select('*')
                .in('session_id', sessionIds)
                .order('created_at', { ascending: false });

            if (dossiersError) {
                throw dossiersError;
            }

            // Group dossiers by session
            const dossiersBySession = (dossiers || []).reduce((acc, dossier) => {
                if (!acc[dossier.session_id]) {
                    acc[dossier.session_id] = [];
                }
                acc[dossier.session_id].push({
                    ...dossier,
                    dossier: dossier.dossier as Record<string, unknown> | null,
                    sources: dossier.sources as unknown[] | null,
                });
                return acc;
            }, {} as Record<string, ProspectDossier[]>);

            // Build reports
            const userReports: UserReport[] = sessions.map(session => ({
                session: {
                    ...session,
                    criteria: session.criteria as DiscoveryCriteria,
                },
                dossiers: dossiersBySession[session.id] || [],
            }));

            setReports(userReports);
        } catch (err) {
            console.error('Error fetching user reports:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch reports'));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    return {
        reports,
        loading,
        error,
        refetch: fetchReports,
    };
}
