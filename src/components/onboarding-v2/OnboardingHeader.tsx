import { OnboardingData } from './OnboardingPage';
import { User } from '@supabase/supabase-js';
import { User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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
  onEditTerritory?: () => void;
  onEditBuyers?: () => void;
}

export function OnboardingHeader({ data, step, user, onEditTerritory, onEditBuyers }: OnboardingHeaderProps) {
  // Only show territory info AFTER step 2 is completed (step >= 3)
  const showTerritoryPills = step >= 3 && (data.states.length > 0 || data.territoryDescription);
  
  // Extract domain from productDescription or use companyDomain
  const extractDomain = (): string | null => {
    // First priority: use companyDomain if set
    if (data.companyDomain) {
      return data.companyDomain;
    }
    
    // Second priority: extract from productDescription
    if (data.productDescription) {
      // Pattern: look for domain-like strings (e.g., "example.com" or "flocksafety.com - specifically alpr")
      // Match domains like: example.com, example.co.uk, subdomain.example.com
      const domainPattern = /([a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})*)/;
      const domainMatch = data.productDescription.match(domainPattern);
      if (domainMatch) {
        let domain = domainMatch[1].toLowerCase();
        // Clean up: remove protocol, www, and any trailing path/text
        domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(' ')[0];
        return domain;
      }
    }
    
    return null;
  };

  const domain = extractDomain();
  
  // Debug: log domain extraction (remove in production)
  if (process.env.NODE_ENV === 'development' && (data.companyDomain || data.productDescription)) {
    console.log('🔍 Domain extraction debug:', {
      'companyDomain': data.companyDomain || '(not set)',
      'productDescription': data.productDescription || '(not set)',
      'extracted domain': domain || '(not found)',
      'will render button': !!domain
    });
  }
  
  // Get category labels for pills
  const CATEGORY_LABELS: Record<string, string> = {
    'police': 'Police Departments',
    'sheriff': 'Sheriff Offices',
    'fire': 'Fire Departments',
    'ems': 'EMS/Ambulance',
    'schools_k12': 'K-12 Schools',
    'higher_ed': 'Higher Education',
    'city_gov': 'City Government',
    'county_gov': 'County Government',
    'state_agency': 'State Agencies',
    'transit': 'Transit Authorities',
    'utilities': 'Public Utilities',
    'hospitals': 'Public Hospitals',
  };

  // Show buyer category pills after step 3
  const showBuyerPills = step >= 4 && data.targetCategories.length > 0;

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between relative z-10 flex-wrap gap-2">
      {/* Filter Pills Row */}
      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
        {/* Territory pills - show after step 2 is done */}
        {showTerritoryPills && (
          <>
            {data.isCustomTerritory && data.territoryDescription ? (
              <button
                onClick={() => onEditTerritory?.()}
                className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer max-w-xs truncate"
                title={`Custom territory: ${data.territoryDescription}`}
              >
                {data.territoryDescription.length > 30 
                  ? data.territoryDescription.slice(0, 30) + '...' 
                  : data.territoryDescription}
              </button>
            ) : (
              <>
                {data.states.slice(0, 6).map(state => (
                  <button
                    key={state}
                    onClick={() => onEditTerritory?.()}
                    className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                    title="Click to edit territory"
                  >
                    {STATE_ABBREV[state] || state}
                  </button>
                ))}
                {data.states.length > 6 && (
                  <button
                    onClick={() => onEditTerritory?.()}
                    className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
                    title="Click to edit territory"
                  >
                    +{data.states.length - 6}
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* Buyer category pills - show after step 3 is done */}
        {showBuyerPills && (
          <>
            {data.targetCategories.slice(0, 3).map(category => (
              <button
                key={category}
                onClick={() => onEditBuyers?.()}
                className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                title="Click to edit buyer types"
              >
                {CATEGORY_LABELS[category] || category}
              </button>
            ))}
            {data.targetCategories.length > 3 && (
              <button
                onClick={() => onEditBuyers?.()}
                className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
                title="Click to edit buyer types"
              >
                +{data.targetCategories.length - 3} more
              </button>
            )}
          </>
        )}
      </div>

      {/* Right side - Sign in button */}
      <div className="flex items-center gap-3 flex-shrink-0">
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
          <Link to="/auth" state={{ from: '/start' }}>
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 px-3 text-sm"
            >
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
