import { OnboardingData } from './OnboardingPage';
import { User } from '@supabase/supabase-js';
import { User as UserIcon } from 'lucide-react';

interface OnboardingHeaderProps {
  data: OnboardingData;
  step: number;
  user: User | null;
}

export function OnboardingHeader({ data, step, user }: OnboardingHeaderProps) {
  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      {/* Left side - Product description pill */}
      <div className="flex items-center gap-4">
        {data.productDescription && (
          <div className="px-4 py-2 bg-gray-100 rounded-lg border border-gray-200 text-sm">
            {data.productDescription.length > 40 
              ? data.productDescription.slice(0, 40) + '...' 
              : data.productDescription}
          </div>
        )}

        {/* Territory selector (step 2+) */}
        {step >= 2 && (
          <TerritoryTabs data={data} />
        )}
      </div>

      {/* Right side - Company info & profile */}
      <div className="flex items-center gap-3">
        {data.companyDomain && (
          <div className="px-4 py-2 bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium">
            {data.companyDomain}
          </div>
        )}
        
        {user ? (
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {user.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-5 h-5 text-gray-500" />
            )}
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>
    </header>
  );
}

function TerritoryTabs({ data }: { data: OnboardingData }) {
  const hasTerritory = data.region || data.states.length > 0 || data.cities.length > 0;
  
  if (!hasTerritory && !data.territoryDescription) {
    return (
      <div className="flex items-center border border-gray-200 rounded-full overflow-hidden bg-white">
        <button className="px-6 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-200">
          Region
        </button>
        <span className="text-gray-300 px-1">|</span>
        <button className="px-6 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
          State
        </button>
        <span className="text-gray-300 px-1">|</span>
        <button className="px-6 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
          Cities
        </button>
        <button className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-full ml-2">
          Describe
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {data.region && (
        <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm border border-gray-200">
          {data.region}
        </span>
      )}
      {data.states.map(state => (
        <span key={state} className="px-3 py-1.5 bg-gray-100 rounded-full text-sm border border-gray-200">
          {state}
        </span>
      ))}
      {data.cities.slice(0, 3).map(city => (
        <span key={city} className="px-3 py-1.5 bg-gray-100 rounded-full text-sm border border-gray-200">
          {city}
        </span>
      ))}
      {data.cities.length > 3 && (
        <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm border border-gray-200">
          +{data.cities.length - 3} more
        </span>
      )}
    </div>
  );
}
