
import { Mail, ArrowRight, Loader2, FlaskConical } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const isDev = import.meta.env.DEV;

interface VerificationState {
    email?: string;
    targetAccount?: string;
}

export default function VerificationPending() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = (location.state as VerificationState) || {};
    const email = state.email || 'your inbox';
    const targetAccount = state.targetAccount || 'your target';

    const [resending, setResending] = useState(false);
    const [devBypassing, setDevBypassing] = useState(false);

    const handleResend = async () => {
        if (!state.email) return;

        setResending(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: state.email,
                options: {
                    emailRedirectTo: window.location.origin + '/thank-you',
                },
            });

            if (error) throw error;
            toast.success('Verification email sent!');
        } catch (error) {
            console.error('Error resending email:', error);
            toast.error('Failed to resend email. Please try again.');
        } finally {
            setResending(false);
        }
    };

    const handleDevBypass = async () => {
        if (!isDev) return;
        
        setDevBypassing(true);
        try {
            // Create a test user with a unique email
            const testEmail = `dev+${Date.now()}@riplacer.test`;
            const testPassword = 'devtest123456';
            
            // Try to sign up (Supabase auto-confirms in local dev by default)
            const { data, error } = await supabase.auth.signUp({
                email: testEmail,
                password: testPassword,
            });

            if (error) {
                // If sign up fails, try signing in (maybe user already exists)
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: testEmail,
                    password: testPassword,
                });
                if (signInError) throw signInError;
            }

            // Check if we have a session
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                toast.success('Dev bypass: Signed in as test user');
                navigate('/thank-you', { state: { email: testEmail, targetAccount } });
            } else if (data?.user && !data?.session) {
                // User created but not confirmed (remote Supabase without auto-confirm)
                toast.error('Dev bypass failed: Email confirmation required on remote Supabase. Enable "Auto-confirm users" in Supabase Auth settings for dev.');
            } else {
                toast.error('Dev bypass failed: No session created');
            }
        } catch (error) {
            console.error('Dev bypass error:', error);
            toast.error(`Dev bypass failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setDevBypassing(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-8 py-16">
            <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-blue-600" />
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    Check your email
                </h1>
                <p className="text-gray-600 mb-8">
                    We sent a verification link to <span className="font-medium text-gray-900">{email}</span>.
                    Click the link to confirm your account and get your briefing on <span className="font-medium text-gray-900">{targetAccount}</span>.
                </p>

                <div className="bg-gray-50 rounded-xl p-6 text-left mb-8">
                    <h3 className="font-semibold text-gray-900 mb-3">Next steps</h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                        <li className="flex gap-2">
                            <span className="w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                            Open the email from Riplacer
                        </li>
                        <li className="flex gap-2">
                            <span className="w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                            Click the "Sign in" or "Confirm" link
                        </li>
                        <li className="flex gap-2">
                            <span className="w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                            You'll be redirected to your dashboard
                        </li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <Button
                        onClick={() => window.open('https://gmail.com', '_blank')}
                        variant="outline"
                        className="w-full h-12 text-base font-medium"
                    >
                        Open Gmail
                    </Button>

                    <button
                        onClick={handleResend}
                        disabled={resending || !state.email}
                        className="text-sm text-gray-500 hover:text-primary transition-colors disabled:opacity-50"
                    >
                        {resending ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" /> Resending...
                            </span>
                        ) : (
                            "Didn't receive it? Click to resend"
                        )}
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100">
                    <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                        &larr; Back to homepage
                    </Link>
                </div>

                {isDev && (
                    <div className="mt-6 pt-6 border-t border-dashed border-orange-300">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-orange-700 text-sm font-medium mb-2">
                                <FlaskConical className="w-4 h-4" />
                                Dev Mode Only
                            </div>
                            <p className="text-xs text-orange-600 mb-3">
                                Skip email verification by creating a test user. Only works in development.
                            </p>
                            <Button
                                onClick={handleDevBypass}
                                disabled={devBypassing}
                                variant="outline"
                                size="sm"
                                className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                            >
                                {devBypassing ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Bypassing...
                                    </span>
                                ) : (
                                    'Skip Verification (Dev Bypass)'
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
