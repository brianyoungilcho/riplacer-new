import React, { useMemo, useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Edit2, Save, X, Plus, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";

type SellerProfileProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut?: () => void;
};

export default function SellerProfile({ open, onOpenChange, onSignOut }: SellerProfileProps) {
  const { profile, loading, updateProfile } = useUserProfile();

  // Track which sections are in edit mode
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Local form state for editing
  const [formData, setFormData] = useState({
    company_name: "",
    company_website: "",
    product_description: "",
    competitor_names: [] as string[],
    onboarding_data: {
      states: [] as string[],
      targetCategories: [] as string[],
      region: "",
      isCustomTerritory: false,
      territoryDescription: "",
    },
  });

  // Update local form when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        company_name: profile.company_name || "",
        company_website: profile.company_website || "",
        product_description: profile.product_description || "",
        competitor_names: profile.competitor_names || [],
        onboarding_data: profile.onboarding_data || {
          states: [],
          targetCategories: [],
          region: "",
          isCustomTerritory: false,
          territoryDescription: "",
        },
      });
    }
  }, [profile]);

  const startEditing = (section: string) => {
    setEditingSection(section);
  };

  const cancelEditing = () => {
    // Reset form data to current profile data
    if (profile) {
      setFormData({
        company_name: profile.company_name || "",
        company_website: profile.company_website || "",
        product_description: profile.product_description || "",
        competitor_names: profile.competitor_names || [],
        onboarding_data: profile.onboarding_data || {
          states: [],
          targetCategories: [],
          region: "",
          isCustomTerritory: false,
          territoryDescription: "",
        },
      });
    }
    setEditingSection(null);
  };

  const saveSection = async (section: string) => {
    try {
      let updates: any = {};

      switch (section) {
        case "company":
          updates = {
            company_name: formData.company_name,
            company_website: formData.company_website,
          };
          break;
        case "product":
          updates = {
            product_description: formData.product_description,
          };
          break;
        case "territory":
          updates = {
            onboarding_data: {
              ...formData.onboarding_data,
            },
          };
          break;
        case "buyers":
          updates = {
            onboarding_data: {
              ...formData.onboarding_data,
            },
          };
          break;
        case "competitors":
          updates = {
            competitor_names: formData.competitor_names,
          };
          break;
      }

      await updateProfile(updates);
      toast.success("Profile updated successfully");
      setEditingSection(null);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const addCompetitor = () => {
    setFormData(prev => ({
      ...prev,
      competitor_names: [...prev.competitor_names, ""],
    }));
  };

  const updateCompetitor = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      competitor_names: prev.competitor_names.map((comp, i) => i === index ? value : comp),
    }));
  };

  const removeCompetitor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      competitor_names: prev.competitor_names.filter((_, i) => i !== index),
    }));
  };

  const updateTerritoryStates = (states: string[]) => {
    setFormData(prev => ({
      ...prev,
      onboarding_data: {
        ...prev.onboarding_data,
        states,
      },
    }));
  };

  const updateTargetCategories = (categories: string[]) => {
    setFormData(prev => ({
      ...prev,
      onboarding_data: {
        ...prev.onboarding_data,
        targetCategories: categories,
      },
    }));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const profileUpdatedAt = profile?.updated_at || profile?.created_at;
  const profileAgeDays = useMemo(() => {
    if (!profileUpdatedAt) return null;
    return Math.floor((Date.now() - new Date(profileUpdatedAt).getTime()) / (1000 * 60 * 60 * 24));
  }, [profileUpdatedAt]);
  const showStaleBanner = profileAgeDays === null || profileAgeDays > 30;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold text-gray-900">My Selling Profile</SheetTitle>
          <SheetDescription className="text-gray-600">
            This is your source of truth about your business. Research uses this context.
          </SheetDescription>
        </SheetHeader>

        {showStaleBanner && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your profile hasn&apos;t been updated
            {profileAgeDays ? ` in ${profileAgeDays} days` : ""}. Stale profile data may affect research quality.
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Company Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Company</h2>
                {editingSection === "company" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveSection("company")}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startEditing("company")}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>

              {editingSection === "company" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <Input
                      value={formData.company_website}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_website: e.target.value }))}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-900 font-medium">
                    {profile?.company_name || "Not set"}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {profile?.company_website || "No website"}
                  </p>
                </div>
              )}
            </div>

            {/* Product Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">What You Sell</h2>
                {editingSection === "product" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveSection("product")}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startEditing("product")}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>

              {editingSection === "product" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Description
                  </label>
                  <Textarea
                    value={formData.product_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_description: e.target.value }))}
                    placeholder="Describe your product or service..."
                    rows={4}
                  />
                </div>
              ) : (
                <p className="text-gray-700">
                  {profile?.product_description || "Not set"}
                </p>
              )}
            </div>

            {/* Territory Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Territory</h2>
                {editingSection === "territory" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveSection("territory")}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startEditing("territory")}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>

              {editingSection === "territory" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    States (press Enter to add)
                  </label>
                  <Input
                    placeholder="Type a state and press Enter..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value && !formData.onboarding_data.states.includes(value)) {
                          updateTerritoryStates([...formData.onboarding_data.states, value]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.onboarding_data.states.map((state, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {state}
                        <button
                          onClick={() => updateTerritoryStates(formData.onboarding_data.states.filter((_, i) => i !== index))}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700">
                    {profile?.onboarding_data?.states?.join(", ") || "No territory set"}
                  </p>
                  {profile?.onboarding_data?.region && (
                    <p className="text-gray-600 text-sm mt-1">
                      Region: {profile.onboarding_data.region}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Buyers Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Target Buyers</h2>
                {editingSection === "buyers" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveSection("buyers")}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startEditing("buyers")}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>

              {editingSection === "buyers" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categories (press Enter to add)
                  </label>
                  <Input
                    placeholder="Type a category and press Enter..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value && !formData.onboarding_data.targetCategories.includes(value)) {
                          updateTargetCategories([...formData.onboarding_data.targetCategories, value]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.onboarding_data.targetCategories.map((category, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                        {category}
                        <button
                          onClick={() => updateTargetCategories(formData.onboarding_data.targetCategories.filter((_, i) => i !== index))}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-700">
                  {profile?.onboarding_data?.targetCategories?.join(", ") || "No buyer categories set"}
                </p>
              )}
            </div>

            {/* Competitors Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Competitors</h2>
                {editingSection === "competitors" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveSection("competitors")}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startEditing("competitors")}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>

              {editingSection === "competitors" ? (
                <div className="space-y-3">
                  {formData.competitor_names.map((competitor, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={competitor}
                        onChange={(e) => updateCompetitor(index, e.target.value)}
                        placeholder="Competitor name"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeCompetitor(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCompetitor}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Competitor
                  </Button>
                </div>
              ) : (
                <div>
                  {profile?.competitor_names && profile.competitor_names.length > 0 ? (
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {profile.competitor_names.map((competitor, index) => (
                        <li key={index}>{competitor}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-700">No competitors set</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Last updated: {formatDate(profile?.updated_at || profile?.created_at)}</span>
              {onSignOut && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onSignOut();
                  }}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}