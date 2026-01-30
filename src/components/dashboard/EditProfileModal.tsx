import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { UserProfile, OnboardingData } from '@/hooks/useUserProfile';
import { toast } from 'sonner';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile | null;
    onSave: (updates: Partial<UserProfile>) => Promise<void>;
}

export function EditProfileModal({ isOpen, onClose, profile, onSave }: EditProfileModalProps) {
    const onboardingData = profile?.onboarding_data as OnboardingData | null;

    const [companyName, setCompanyName] = useState(profile?.company_name || onboardingData?.companyName || '');
    const [productDescription, setProductDescription] = useState(profile?.product_description || onboardingData?.productDescription || '');
    const [competitors, setCompetitors] = useState((profile?.competitor_names || onboardingData?.competitors || []).join(', '));
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            const competitorList = competitors
                .split(',')
                .map(c => c.trim())
                .filter(c => c.length > 0);

            await onSave({
                company_name: companyName || null,
                product_description: productDescription || null,
                competitor_names: competitorList.length > 0 ? competitorList : null,
            });

            toast.success('Profile updated successfully');
        } catch (error) {
            console.error('Failed to save profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                            id="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Your company name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="productDescription">What You Sell</Label>
                        <Textarea
                            id="productDescription"
                            value={productDescription}
                            onChange={(e) => setProductDescription(e.target.value)}
                            placeholder="Describe your product or service..."
                            rows={4}
                        />
                        <p className="text-xs text-gray-500">
                            Help us understand what you sell so we can find the best opportunities.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="competitors">Competitors</Label>
                        <Input
                            id="competitors"
                            value={competitors}
                            onChange={(e) => setCompetitors(e.target.value)}
                            placeholder="Competitor A, Competitor B, Competitor C"
                        />
                        <p className="text-xs text-gray-500">
                            Separate multiple competitors with commas.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
