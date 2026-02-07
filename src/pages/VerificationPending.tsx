
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
            toast.error('Failed to resend email. Please try again.');
        } finally {
            setResending(false);
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

            </div>
        </div>
    );
}
