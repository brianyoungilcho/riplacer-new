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
  onEditDomain?: () => void;
  onEditTerritory?: () => void;
}

export function OnboardingHeader({ data, step, user, onEditDomain, onEditTerritory }: OnboardingHeaderProps) {
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
  
  return (
    <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between relative z-10">
      {/* Left side - Product description (full, truncated) and Territory pills */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {data.productDescription && (
          <button
            onClick={() => onEditDomain?.()}
            className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer truncate max-w-md"
            title={data.productDescription}
          >
            {data.productDescription.length > 50 
              ? data.productDescription.slice(0, 50) + '...' 
              : data.productDescription}
          </button>
        )}

        {/* Territory pills - only show after step 2 is done */}
        {showTerritoryPills && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {data.states.slice(0, 5).map(state => (
              <button
                key={state}
                onClick={() => onEditTerritory?.()}
                className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                title="Click to edit territory"
              >
                {STATE_ABBREV[state] || state}
              </button>
            ))}
            {data.states.length > 5 && (
              <button
                onClick={() => onEditTerritory?.()}
                className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
                title="Click to edit territory"
              >
                +{data.states.length - 5}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right side - Domain and Profile/Sign up */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {domain && (
          <button
            onClick={() => onEditDomain?.()}
            className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
            title="Click to edit domain"
          >
            {domain}
          </button>
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
          <Link to="/auth">
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 px-3 text-sm"
            >
              Sign up
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
