import { OnboardingData } from './OnboardingPage';
import { User } from '@supabase/supabase-js';
import { User as UserIcon } from 'lucide-react';

// State abbreviations for compact display
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

interface OnboardingHeaderProps {
  data: OnboardingData;
  step: number;
  user: User | null;
}

export function OnboardingHeader({ data, step, user }: OnboardingHeaderProps) {
  // Only show territory info AFTER step 2 is completed (step >= 3)
  const showTerritoryPills = step >= 3 && (data.states.length > 0 || data.territoryDescription);
  
  return (
    <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      {/* Left side - Product description */}
      <div className="flex items-center gap-3">
        {data.productDescription && (
          <div className="px-4 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700">
            {data.productDescription.length > 50 
              ? data.productDescription.slice(0, 50) + '...' 
              : data.productDescription}
          </div>
        )}

        {/* Territory pills - only show after step 2 is done */}
        {showTerritoryPills && (
          <div className="flex items-center gap-2">
            {data.states.slice(0, 5).map(state => (
              <span 
                key={state} 
                className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600"
              >
                {STATE_ABBREV[state] || state}
              </span>
            ))}
            {data.states.length > 5 && (
              <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-500">
                +{data.states.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side - Company domain & profile */}
      <div className="flex items-center gap-3">
        {data.companyDomain && (
          <div className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-600">
            {data.companyDomain}
          </div>
        )}
        
        {user ? (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {user.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-gray-500" />
            )}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
    </header>
  );
}
