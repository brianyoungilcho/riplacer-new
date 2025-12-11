import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { OnboardingData } from './OnboardingPage';
import { cn } from '@/lib/utils';
import { 
  Crosshair, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  Search, 
  Star, 
  Settings,
  SlidersHorizontal,
  User as UserIcon
} from 'lucide-react';

// State abbreviations
const STATE_ABBREV: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
};

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  'police': 'Police',
  'sheriff': 'Sheriff',
  'fire': 'Fire Dept',
  'ems': 'EMS',
  'schools_k12': 'K-12 Schools',
  'higher_ed': 'Higher Ed',
  'city_gov': 'City Gov',
  'county_gov': 'County Gov',
  'state_agency': 'State Agency',
  'transit': 'Transit',
  'utilities': 'Utilities',
  'hospitals': 'Hospitals',
};

interface WorkspaceSidebarProps {
  data: OnboardingData;
  user: User | null;
  onEditCriteria: (step: number) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function WorkspaceSidebar({ 
  data, 
  user, 
  onEditCriteria,
  expanded = true,
  onToggleExpand
}: WorkspaceSidebarProps) {
  const [criteriaExpanded, setCriteriaExpanded] = useState(false);
  const [activeNav, setActiveNav] = useState<'discovery' | 'saved' | 'settings'>('discovery');

  // Collapsed state - icon-only sidebar
  if (!expanded) {
    return (
      <aside className="w-16 bg-white border-r border-gray-200 flex flex-col relative">
        <div className="flex flex-col h-full py-4 items-center">
          {/* Logo */}
          <Link 
            to="/"
            className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center mb-6"
            title="Riplacer"
          >
            <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
          </Link>

          {/* Criteria toggle */}
          <button
            onClick={() => onToggleExpand?.()}
            className="w-10 h-10 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center mb-2 transition-colors"
            title="Search Criteria"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-500" />
          </button>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col items-center gap-1 mt-4">
            <button
              onClick={() => setActiveNav('discovery')}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                activeNav === 'discovery'
                  ? "bg-red-50 text-red-600"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              )}
              title="Discovery"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveNav('saved')}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative",
                activeNav === 'saved'
                  ? "bg-red-50 text-red-600"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              )}
              title="Saved Leads"
            >
              <Star className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveNav('settings')}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                activeNav === 'settings'
                  ? "bg-red-50 text-red-600"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              )}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </nav>

          {/* User */}
          <div className="mt-auto">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {user?.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-4 h-4 text-gray-500" />
              )}
            </div>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={onToggleExpand}
          className="absolute top-16 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 hover:shadow-md transition-all z-10"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-3 h-3 text-gray-600" />
        </button>
      </aside>
    );
  }

  // Expanded state - full sidebar
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col relative">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <Link 
          to="/"
          className="flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">
            Riplacer
          </span>
        </Link>
      </div>

      {/* Criteria Accordion */}
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={() => setCriteriaExpanded(!criteriaExpanded)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Search Criteria</span>
          </div>
          {criteriaExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Expanded Criteria Details */}
        {criteriaExpanded && (
          <div className="mt-3 space-y-3 px-1">
            {/* Product */}
            <div className="text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Product</span>
                <button 
                  onClick={() => onEditCriteria(1)}
                  className="text-xs text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
              <p className="text-gray-700 truncate">
                {data.productDescription || data.companyDomain || 'Not set'}
              </p>
            </div>

            {/* Territory */}
            <div className="text-sm border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Territory</span>
                <button 
                  onClick={() => onEditCriteria(2)}
                  className="text-xs text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {data.states.slice(0, 4).map(state => (
                  <span 
                    key={state} 
                    className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                  >
                    {STATE_ABBREV[state] || state}
                  </span>
                ))}
                {data.states.length > 4 && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                    +{data.states.length - 4}
                  </span>
                )}
                {data.states.length === 0 && (
                  <span className="text-gray-400 text-xs">Not set</span>
                )}
              </div>
            </div>

            {/* Buyers */}
            <div className="text-sm border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Buyers</span>
                <button 
                  onClick={() => onEditCriteria(3)}
                  className="text-xs text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {data.targetCategories.slice(0, 3).map(cat => (
                  <span 
                    key={cat} 
                    className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                ))}
                {data.targetCategories.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                    +{data.targetCategories.length - 3}
                  </span>
                )}
                {data.targetCategories.length === 0 && (
                  <span className="text-gray-400 text-xs">Not set</span>
                )}
              </div>
            </div>

            {/* Competitors */}
            <div className="text-sm border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Competitors</span>
                <button 
                  onClick={() => onEditCriteria(4)}
                  className="text-xs text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {data.competitors.slice(0, 3).map(comp => (
                  <span 
                    key={comp} 
                    className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                  >
                    {comp}
                  </span>
                ))}
                {data.competitors.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                    +{data.competitors.length - 3}
                  </span>
                )}
                {data.competitors.length === 0 && (
                  <span className="text-gray-400 text-xs">Not set</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <button
          onClick={() => setActiveNav('discovery')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors",
            activeNav === 'discovery'
              ? "bg-red-50 text-red-600"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Search className="w-5 h-5" />
          Discovery
        </button>
        <button
          onClick={() => setActiveNav('saved')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors",
            activeNav === 'saved'
              ? "bg-red-50 text-red-600"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Star className="w-5 h-5" />
          Saved Leads
          <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">0</span>
        </button>
        <button
          onClick={() => setActiveNav('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors",
            activeNav === 'settings'
              ? "bg-red-50 text-red-600"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <div className="text-sm min-w-0 flex-1">
            {user ? (
              <>
                <p className="font-medium text-gray-900 truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="text-gray-500 text-xs truncate">{user.email}</p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-900">Guest</p>
                <p className="text-gray-500 text-xs">Sign in to save</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggleExpand}
        className="absolute top-16 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 hover:shadow-md transition-all z-10"
        aria-label="Collapse sidebar"
      >
        <ChevronLeft className="w-3 h-3 text-gray-600" />
      </button>
    </aside>
  );
}
