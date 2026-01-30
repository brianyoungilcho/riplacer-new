import { useUserProfile, type OnboardingData } from '@/hooks/useUserProfile';
import { Building2, MapPin, Users, Crosshair, FileText, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { EditProfileModal } from './EditProfileModal';

interface ProfileSectionProps {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}

function ProfileSection({ icon, title, children }: ProfileSectionProps) {
    return (
        <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-500 mb-1">{title}</h4>
                <div className="text-sm text-gray-900">{children}</div>
            </div>
        </div>
    );
}

function TagList({ items, emptyText = 'Not specified' }: { items: string[] | null | undefined; emptyText?: string }) {
    if (!items || items.length === 0) {
        return <span className="text-gray-400 italic">{emptyText}</span>;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((item, index) => (
                <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium"
                >
                    {item}
                </span>
            ))}
        </div>
    );
}

export function UserProfileCard() {
    const { profile, loading, error, updateProfile, refetch } = useUserProfile();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="text-center py-8">
                    <p className="text-sm text-red-600">Failed to load profile</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    const onboardingData = profile?.onboarding_data as OnboardingData | null;

    // Determine display values
    const companyName = profile?.company_name || onboardingData?.companyName || 'Your Company';
    const productDescription = profile?.product_description || onboardingData?.productDescription;
    const competitors = profile?.competitor_names || onboardingData?.competitors || [];
    const targetCategories = onboardingData?.targetCategories || [];

    // Territory display
    let territoryDisplay: string;
    if (onboardingData?.isCustomTerritory && onboardingData?.territoryDescription) {
        territoryDisplay = onboardingData.territoryDescription;
    } else if (onboardingData?.states && onboardingData.states.length > 0) {
        territoryDisplay = onboardingData.states.length > 3
            ? `${onboardingData.states.slice(0, 3).join(', ')} +${onboardingData.states.length - 3} more`
            : onboardingData.states.join(', ');
    } else if (onboardingData?.region) {
        territoryDisplay = onboardingData.region;
    } else {
        territoryDisplay = 'Not specified';
    }

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Our Understanding</h3>
                        <p className="text-sm text-gray-500">How Riplacer sees your business</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditModalOpen(true)}
                        className="gap-1.5"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Company & Product */}
                    <ProfileSection
                        icon={<Building2 className="w-4 h-4 text-primary" />}
                        title={companyName}
                    >
                        {productDescription ? (
                            <p className="line-clamp-3">{productDescription}</p>
                        ) : (
                            <span className="text-gray-400 italic">No product description</span>
                        )}
                    </ProfileSection>

                    {/* Territory */}
                    <ProfileSection
                        icon={<MapPin className="w-4 h-4 text-primary" />}
                        title="Sales Territory"
                    >
                        <p>{territoryDisplay}</p>
                    </ProfileSection>

                    {/* Target Buyers */}
                    <ProfileSection
                        icon={<Users className="w-4 h-4 text-primary" />}
                        title="Target Buyers"
                    >
                        <TagList items={targetCategories} emptyText="No buyer categories specified" />
                    </ProfileSection>

                    {/* Competitors */}
                    <ProfileSection
                        icon={<Crosshair className="w-4 h-4 text-primary" />}
                        title="Tracked Competitors"
                    >
                        <TagList items={competitors} emptyText="No competitors tracked" />
                    </ProfileSection>

                    {/* Additional Context */}
                    {onboardingData?.additionalContext && (
                        <ProfileSection
                            icon={<FileText className="w-4 h-4 text-primary" />}
                            title="Additional Context"
                        >
                            <p className="line-clamp-2">{onboardingData.additionalContext}</p>
                        </ProfileSection>
                    )}
                </div>
            </div>

            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                profile={profile}
                onSave={async (updates) => {
                    await updateProfile(updates);
                    setIsEditModalOpen(false);
                }}
            />
        </>
    );
}
