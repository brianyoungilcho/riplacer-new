import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  X, 
  Check,
  ChevronDown,
  Plus,
  Minus,
  ExternalLink,
  Star,
  Crosshair
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// DATA & TYPES
// ============================================

type OnboardingStep = 'selling' | 'where' | 'who' | 'competitors' | 'results';

interface UserContext {
  productDescription: string;
  companyUrl?: string;
  profileImage?: string;
  region?: string;
  states: string[];
  cities: string[];
  territoryDescription?: string;
  sectors: string[];
  filters: string[];
  competitors: string[];
}

interface Prospect {
  id: string;
  name: string;
  score: number;
  contractValue: string;
  reasonTag: string;
  reasonColor: 'green' | 'blue' | 'amber';
  riplaceAngle: string;
  sources: { label: string; url: string }[];
  lastUpdated: string;
  isFavorited?: boolean;
}

// US Regions with states
const US_REGIONS = {
  'Northeast': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
  'Midwest': ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  'South': ['DE', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'DC', 'WV', 'AL', 'KY', 'MS', 'TN', 'AR', 'LA', 'OK', 'TX'],
  'West': ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA'],
};

const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'Washington D.C.'
};

// Major cities by state (simplified - would be fetched from API in production)
const CITIES_BY_STATE: Record<string, string[]> = {
  'CA': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Oakland', 'Fresno', 'Long Beach'],
  'TX': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso', 'Arlington', 'Plano'],
  'FL': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'St. Petersburg', 'Hialeah'],
  'NY': ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany', 'Yonkers'],
  'IL': ['Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford', 'Springfield'],
  'PA': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Scranton'],
  'OH': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton'],
  'GA': ['Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah', 'Athens'],
  'NC': ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville'],
  'MI': ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing'],
  'NJ': ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison', 'Trenton'],
  'VA': ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News', 'Alexandria'],
  'WA': ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent'],
  'AZ': ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Gilbert'],
  'MA': ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell', 'Brockton'],
  'TN': ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro'],
  'IN': ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Bloomington'],
  'MO': ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence', 'Lee\'s Summit'],
  'MD': ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Bowie', 'Hagerstown'],
  'WI': ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton'],
  'CO': ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton'],
  'MN': ['Minneapolis', 'St. Paul', 'Rochester', 'Duluth', 'Bloomington', 'Brooklyn Park'],
  'SC': ['Charleston', 'Columbia', 'North Charleston', 'Mount Pleasant', 'Rock Hill', 'Greenville'],
  'AL': ['Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa', 'Hoover'],
  'LA': ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Kenner'],
  'KY': ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Richmond'],
  'OR': ['Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro', 'Beaverton'],
  'OK': ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Lawton', 'Edmond'],
  'CT': ['Bridgeport', 'New Haven', 'Hartford', 'Stamford', 'Waterbury', 'Norwalk'],
  'UT': ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem', 'Sandy'],
  'IA': ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City', 'Waterloo'],
  'NV': ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Carson City'],
  'AR': ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro', 'Rogers'],
  'MS': ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi', 'Meridian'],
  'KS': ['Wichita', 'Overland Park', 'Kansas City', 'Olathe', 'Topeka', 'Lawrence'],
  'NM': ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell', 'Farmington'],
  'NE': ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney', 'Fremont'],
  'ID': ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Pocatello', 'Caldwell'],
  'WV': ['Charleston', 'Huntington', 'Morgantown', 'Parkersburg', 'Wheeling', 'Weirton'],
  'HI': ['Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Waipahu', 'Kaneohe'],
  'NH': ['Manchester', 'Nashua', 'Concord', 'Derry', 'Dover', 'Rochester'],
  'ME': ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn', 'Biddeford'],
  'RI': ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'East Providence', 'Woonsocket'],
  'MT': ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte', 'Helena'],
  'DE': ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna', 'Milford'],
  'SD': ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown', 'Mitchell'],
  'ND': ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo', 'Williston'],
  'AK': ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan', 'Wasilla'],
  'DC': ['Washington'],
  'VT': ['Burlington', 'South Burlington', 'Rutland', 'Barre', 'Montpelier', 'Winooski'],
  'WY': ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs', 'Sheridan'],
};

// Buyer sectors
const BUYER_SECTORS = [
  { id: 'police', name: 'Police Departments' },
  { id: 'fire', name: 'Fire Departments' },
  { id: 'schools', name: 'K-12 Schools' },
  { id: 'higher_ed', name: 'Higher Education' },
  { id: 'city', name: 'City Government' },
  { id: 'county', name: 'County Government' },
  { id: 'state', name: 'State Agencies' },
  { id: 'healthcare', name: 'Public Healthcare' },
  { id: 'transit', name: 'Public Transit' },
  { id: 'utilities', name: 'Public Utilities' },
];

// Sample competitors (would be AI-generated in production)
const SAMPLE_COMPETITORS = [
  'Axon', 'Motorola Solutions', 'ShotSpotter', 'Tyler Technologies', 
  'Samsara', 'Verizon Connect', 'Geotab', 'Fleet Complete',
  'Verkada', 'Genetec', 'Milestone Systems'
];

// Mock prospect data
const MOCK_PROSPECTS: Prospect[] = [
  {
    id: '1',
    name: 'Havensville PD',
    score: 85,
    contractValue: '$500,000/yr',
    reasonTag: 'Contract Expiring in <6 months',
    reasonColor: 'green',
    riplaceAngle: 'Their current Axon contract expires in March 2025. Recent city council meeting notes indicate frustration with support response times. New Chief appointed in Q3 2024 is known for modernization initiatives.',
    sources: [
      { label: 'City Council Minutes', url: 'https://example.com/source1' },
      { label: 'Budget Document', url: 'https://example.com/source2' },
      { label: 'News Article', url: 'https://example.com/source3' },
    ],
    lastUpdated: '2025.12.06',
  },
  {
    id: '2',
    name: 'Tontown PD',
    score: 75,
    contractValue: '$250,000/yr',
    reasonTag: 'New Chief in town',
    reasonColor: 'blue',
    riplaceAngle: 'New Police Chief John Martinez was hired from a department that used your solution. He has publicly praised modern technology adoption. Budget increase approved for FY2025.',
    sources: [
      { label: 'Press Release', url: 'https://example.com/source4' },
      { label: 'LinkedIn Profile', url: 'https://example.com/source5' },
    ],
    lastUpdated: '2025.12.05',
  },
  {
    id: '3',
    name: 'Chelsea PD',
    score: 75,
    contractValue: '$125,000/yr',
    reasonTag: 'Competitor under attack in PR',
    reasonColor: 'amber',
    riplaceAngle: 'Recent news coverage critical of their current vendor\'s data privacy practices. City facing public pressure to review technology contracts. Council member publicly questioned current vendor relationship.',
    sources: [
      { label: 'Local News', url: 'https://example.com/source6' },
      { label: 'Council Meeting', url: 'https://example.com/source7' },
      { label: 'Twitter Thread', url: 'https://example.com/source8' },
    ],
    lastUpdated: '2025.12.04',
  },
  {
    id: '4',
    name: 'Riverside Sheriff',
    score: 68,
    contractValue: '$800,000/yr',
    reasonTag: 'Budget increase approved',
    reasonColor: 'green',
    riplaceAngle: 'County commissioners approved 15% budget increase for law enforcement technology. Current equipment described as "aging" in budget justification documents.',
    sources: [
      { label: 'Budget Report', url: 'https://example.com/source9' },
    ],
    lastUpdated: '2025.12.03',
  },
  {
    id: '5',
    name: 'Metro Transit Authority',
    score: 62,
    contractValue: '$350,000/yr',
    reasonTag: 'RFP Expected Q1',
    reasonColor: 'blue',
    riplaceAngle: 'Internal memo indicates RFP for fleet management system expected in January. Current vendor contract not being renewed per board decision.',
    sources: [
      { label: 'Board Minutes', url: 'https://example.com/source10' },
      { label: 'Procurement Calendar', url: 'https://example.com/source11' },
    ],
    lastUpdated: '2025.12.02',
  },
];

// ============================================
// COMPONENTS
// ============================================

interface OnboardingV2Props {
  onComplete: () => void;
}

export function OnboardingV2({ onComplete }: OnboardingV2Props) {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<OnboardingStep>('selling');
  const [loading, setLoading] = useState(false);
  
  const [context, setContext] = useState<UserContext>({
    productDescription: '',
    states: [],
    cities: [],
    sectors: [],
    filters: [],
    competitors: [],
  });
  
  const [expandedProspect, setExpandedProspect] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Territory selector state
  const [territoryTab, setTerritoryTab] = useState<'region' | 'state' | 'cities' | 'describe'>('region');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  
  // Compute available cities based on selected states
  const availableCities = useMemo(() => {
    const cities: string[] = [];
    context.states.forEach(state => {
      const stateCities = CITIES_BY_STATE[state] || [];
      cities.push(...stateCities.map(city => `${city}, ${state}`));
    });
    return cities.sort();
  }, [context.states]);

  // Update context helper
  const updateContext = (updates: Partial<UserContext>) => {
    setContext(prev => ({ ...prev, ...updates }));
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // After sign-in, we'd extract company info from their email domain
      // For now, just proceed to next step
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        title: 'Sign in failed',
        description: 'Please try again or continue without signing in.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Continue to next step
  const handleContinue = () => {
    switch (step) {
      case 'selling':
        setStep('where');
        break;
      case 'where':
        setStep('who');
        break;
      case 'who':
        setStep('competitors');
        break;
      case 'competitors':
        setStep('results');
        break;
      case 'results':
        // Save and navigate to main app
        localStorage.setItem('riplacer_onboarding', JSON.stringify(context));
        localStorage.setItem('riplacer_territory', JSON.stringify({ 
          states: context.states, 
          cities: context.cities 
        }));
        onComplete();
        break;
    }
  };

  // Toggle selection helpers
  const toggleState = (stateCode: string) => {
    updateContext({
      states: context.states.includes(stateCode)
        ? context.states.filter(s => s !== stateCode)
        : [...context.states, stateCode]
    });
  };

  const toggleCity = (city: string) => {
    updateContext({
      cities: context.cities.includes(city)
        ? context.cities.filter(c => c !== city)
        : [...context.cities, city]
    });
  };

  const toggleSector = (sectorId: string) => {
    updateContext({
      sectors: context.sectors.includes(sectorId)
        ? context.sectors.filter(s => s !== sectorId)
        : [...context.sectors, sectorId]
    });
  };

  const toggleCompetitor = (competitor: string) => {
    updateContext({
      competitors: context.competitors.includes(competitor)
        ? context.competitors.filter(c => c !== competitor)
        : [...context.competitors, competitor]
    });
  };

  const toggleFilter = (filter: string) => {
    updateContext({
      filters: context.filters.includes(filter)
        ? context.filters.filter(f => f !== filter)
        : [...context.filters, filter]
    });
  };

  const toggleFavorite = (prospectId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(prospectId)) {
        next.delete(prospectId);
      } else {
        next.add(prospectId);
      }
      return next;
    });
  };

  // Select entire region
  const selectRegion = (regionName: string) => {
    const regionStates = US_REGIONS[regionName as keyof typeof US_REGIONS] || [];
    setSelectedRegion(regionName);
    updateContext({ 
      region: regionName,
      states: regionStates 
    });
    setTerritoryTab('state'); // Auto-advance to state view
  };

  // Can proceed check
  const canProceed = () => {
    switch (step) {
      case 'selling':
        return context.productDescription.trim().length > 0;
      case 'where':
        return context.states.length > 0 || context.territoryDescription;
      case 'who':
        return context.sectors.length > 0;
      case 'competitors':
        return true; // Optional
      case 'results':
        return true;
      default:
        return false;
    }
  };

  // Check if we should show map
  const showMap = step === 'who' || step === 'competitors' || step === 'results';
  
  // Check if we should show results list
  const showResults = step === 'results';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Subtle Sidebar */}
      <aside className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <Link to="/" className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mb-8">
          <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
        </Link>
        {/* Sidebar could have minimal navigation icons in future */}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar - progressively builds up */}
        {step !== 'selling' && (
          <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Product Description Pill */}
              {context.productDescription && (
                <div className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 max-w-xs truncate">
                  {context.productDescription}
                </div>
              )}
              
              {/* Territory Selector (Step 2+) */}
              {(step === 'where' || step === 'who' || step === 'competitors' || step === 'results') && (
                <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
                  <button
                    onClick={() => setTerritoryTab('region')}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium transition-colors",
                      territoryTab === 'region' ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    Region
                  </button>
                  <div className="w-px h-4 bg-gray-200" />
                  <button
                    onClick={() => setTerritoryTab('state')}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium transition-colors",
                      territoryTab === 'state' ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    State
                  </button>
                  <div className="w-px h-4 bg-gray-200" />
                  <button
                    onClick={() => setTerritoryTab('cities')}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium transition-colors",
                      territoryTab === 'cities' ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    Cities
                  </button>
                  <div className="w-px h-4 bg-gray-200" />
                  <button
                    onClick={() => setTerritoryTab('describe')}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium transition-colors",
                      territoryTab === 'describe' ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    Describe
                  </button>
                </div>
              )}
            </div>

            {/* Right side: Company info */}
            <div className="flex items-center gap-3">
              {context.companyUrl && (
                <span className="text-sm text-gray-500">{context.companyUrl}</span>
              )}
              {user ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {user.email?.[0].toUpperCase()}
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={handleGoogleSignIn}>
                  Sign in
                </Button>
              )}
            </div>
          </header>
        )}

        {/* Filter Pills Bar (Step 4+) */}
        {(step === 'competitors' || step === 'results') && context.sectors.length > 0 && (
          <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-2 flex-wrap">
            {context.sectors.map(sectorId => {
              const sector = BUYER_SECTORS.find(s => s.id === sectorId);
              return sector ? (
                <Badge 
                  key={sectorId}
                  variant="outline"
                  className="px-3 py-1 text-sm bg-white"
                >
                  {sector.name}
                </Badge>
              ) : null;
            })}
            {context.filters.map(filter => (
              <Badge 
                key={filter}
                variant="outline"
                className="px-3 py-1 text-sm bg-white cursor-pointer hover:bg-gray-50"
                onClick={() => toggleFilter(filter)}
              >
                {filter}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}

        {/* Main Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel */}
          <div className={cn(
            "bg-white transition-all duration-300 overflow-y-auto",
            showMap ? "w-1/2 border-r border-gray-200" : "w-full"
          )}>
            <div className={cn(
              "p-8",
              !showMap && "max-w-2xl mx-auto"
            )}>
              {/* Step 1: What are you selling? */}
              {step === 'selling' && (
                <div className="min-h-[60vh] flex flex-col justify-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-3 text-center">
                    What are you selling?
                  </h1>
                  <p className="text-gray-600 text-center mb-10">
                    Tell us what you are trying to sell. You can be as descriptive as<br />
                    possible, or simply drop your company's name/URL.
                  </p>
                  
                  <Textarea
                    placeholder="Describe your product or service..."
                    value={context.productDescription}
                    onChange={(e) => updateContext({ productDescription: e.target.value })}
                    className="min-h-[120px] text-base resize-none border-gray-300 focus:border-gray-400 focus:ring-0 mb-6"
                  />
                  
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-4 text-gray-500">OR</span>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-12"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Log in to let us consolidate your company's offering"
                    )}
                  </Button>

                  {canProceed() && (
                    <Button
                      variant="default"
                      size="lg"
                      className="w-full h-12 mt-4 bg-gray-900 hover:bg-gray-800"
                      onClick={handleContinue}
                    >
                      Continue
                    </Button>
                  )}
                </div>
              )}

              {/* Step 2: Where are you selling? */}
              {step === 'where' && (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Where are you selling?
                  </h1>
                  <p className="text-gray-600 mb-8">
                    Tell us about your territories. You can narrow down further afterwards.
                  </p>
                  
                  {/* Territory Content based on tab */}
                  {territoryTab === 'region' && (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.keys(US_REGIONS).map(region => (
                        <button
                          key={region}
                          onClick={() => selectRegion(region)}
                          className={cn(
                            "p-4 rounded-xl border-2 text-left transition-all",
                            selectedRegion === region
                              ? "border-gray-900 bg-gray-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <div className="font-semibold text-gray-900">{region}</div>
                          <div className="text-sm text-gray-500">
                            {US_REGIONS[region as keyof typeof US_REGIONS].length} states
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {territoryTab === 'state' && (
                    <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
                      {Object.entries(STATE_NAMES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                        <button
                          key={code}
                          onClick={() => toggleState(code)}
                          className={cn(
                            "px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                            context.states.includes(code)
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}

                  {territoryTab === 'cities' && (
                    <div>
                      {context.states.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          Select at least one state first
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                          {availableCities.map(city => (
                            <button
                              key={city}
                              onClick={() => toggleCity(city)}
                              className={cn(
                                "px-3 py-2 rounded-lg border text-sm text-left transition-all",
                                context.cities.includes(city)
                                  ? "bg-gray-900 text-white border-gray-900"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                              )}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {territoryTab === 'describe' && (
                    <Textarea
                      placeholder="Describe your territory in detail... (e.g., 'All major cities in the Southwest with population over 100,000')"
                      value={context.territoryDescription || ''}
                      onChange={(e) => updateContext({ territoryDescription: e.target.value })}
                      className="min-h-[200px] text-base"
                    />
                  )}

                  {/* Selection summary */}
                  {(context.states.length > 0 || context.cities.length > 0) && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">
                        <strong>Selected:</strong>{' '}
                        {context.states.length} state{context.states.length !== 1 ? 's' : ''}
                        {context.cities.length > 0 && `, ${context.cities.length} cities`}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="default"
                    size="lg"
                    className="w-full h-12 mt-6 bg-gray-900 hover:bg-gray-800"
                    onClick={handleContinue}
                    disabled={!canProceed()}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {/* Step 3: Who are you selling to? */}
              {step === 'who' && (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Who are you selling to?
                  </h1>
                  <p className="text-gray-600 mb-8">
                    Tell us who your customers are.
                  </p>
                  
                  <div className="space-y-2">
                    {BUYER_SECTORS.map(sector => (
                      <button
                        key={sector.id}
                        onClick={() => toggleSector(sector.id)}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border-2 text-left transition-all flex items-center justify-between",
                          context.sectors.includes(sector.id)
                            ? "border-gray-900 bg-gray-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <span className="font-medium text-gray-900">{sector.name}</span>
                        {context.sectors.includes(sector.id) && (
                          <Check className="w-5 h-5 text-gray-900" />
                        )}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="default"
                    size="lg"
                    className="w-full h-12 mt-6 bg-gray-900 hover:bg-gray-800"
                    onClick={handleContinue}
                    disabled={!canProceed()}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {/* Step 4: Who are your competitors? */}
              {step === 'competitors' && (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Who are your competitors?
                  </h1>
                  <p className="text-gray-600 mb-8">
                    Select competitors we should look for at prospect accounts.
                  </p>
                  
                  <div className="space-y-2">
                    {SAMPLE_COMPETITORS.map(competitor => (
                      <button
                        key={competitor}
                        onClick={() => toggleCompetitor(competitor)}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border-2 text-left transition-all flex items-center justify-between",
                          context.competitors.includes(competitor)
                            ? "border-gray-900 bg-gray-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <span className="font-medium text-gray-900">{competitor}</span>
                        {context.competitors.includes(competitor) && (
                          <Check className="w-5 h-5 text-gray-900" />
                        )}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="default"
                    size="lg"
                    className="w-full h-12 mt-6 bg-gray-900 hover:bg-gray-800"
                    onClick={handleContinue}
                  >
                    Find Prospects
                  </Button>
                </div>
              )}

              {/* Step 5: Results */}
              {step === 'results' && (
                <div>
                  {/* Prospect List */}
                  <div className="space-y-3">
                    {MOCK_PROSPECTS.map(prospect => (
                      <div
                        key={prospect.id}
                        className={cn(
                          "rounded-xl border-2 transition-all overflow-hidden",
                          expandedProspect === prospect.id
                            ? "border-gray-300 bg-blue-50/30"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                      >
                        {/* Prospect Header Row */}
                        <div 
                          className="p-4 flex items-center gap-4 cursor-pointer"
                          onClick={() => setExpandedProspect(
                            expandedProspect === prospect.id ? null : prospect.id
                          )}
                        >
                          {/* Score */}
                          <div className="text-3xl font-bold text-gray-900 w-12">
                            {prospect.score}
                          </div>
                          
                          {/* Name & Value */}
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{prospect.name}</div>
                            <div className="text-sm text-gray-500">{prospect.contractValue}</div>
                          </div>
                          
                          {/* Reason Tag */}
                          <Badge 
                            className={cn(
                              "text-xs",
                              prospect.reasonColor === 'green' && "bg-green-100 text-green-700 border-green-200",
                              prospect.reasonColor === 'blue' && "bg-blue-100 text-blue-700 border-blue-200",
                              prospect.reasonColor === 'amber' && "bg-amber-100 text-amber-700 border-amber-200"
                            )}
                          >
                            {prospect.reasonTag}
                          </Badge>
                          
                          {/* Favorite Toggle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(prospect.id);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Star 
                              className={cn(
                                "w-5 h-5",
                                favorites.has(prospect.id) 
                                  ? "fill-yellow-400 text-yellow-400" 
                                  : "text-gray-400"
                              )} 
                            />
                          </button>
                        </div>

                        {/* Expanded Content */}
                        {expandedProspect === prospect.id && (
                          <div className="px-4 pb-4 border-t border-gray-200 pt-4 space-y-4">
                            {/* Riplace Angle */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Riplace Angle</h4>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {prospect.riplaceAngle}
                              </p>
                            </div>

                            {/* Date & Sources */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">
                                As of {prospect.lastUpdated}
                              </span>
                              <div className="flex gap-2">
                                {prospect.sources.map((source, i) => (
                                  <a
                                    key={i}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1"
                                  >
                                    {source.label}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ))}
                              </div>
                            </div>

                            {/* User Notes */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Add your own knowledge to refine your Riplace Strategies
                              </h4>
                              <Textarea
                                placeholder="e.g., Chief is not a huge fan of something and is a dead zone. We should avoid and need a different way to navigate the market."
                                value={userNotes[prospect.id] || ''}
                                onChange={(e) => setUserNotes(prev => ({
                                  ...prev,
                                  [prospect.id]: e.target.value
                                }))}
                                className="min-h-[80px] text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Map */}
          {showMap && (
            <div className="w-1/2 bg-gray-100 relative">
              {/* Map placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 text-lg mb-2">Map Interface</div>
                  <p className="text-gray-400 text-sm">
                    Interactive map will display here
                  </p>
                </div>
              </div>

              {/* Draw button */}
              <button className="absolute top-4 right-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Draw
              </button>

              {/* Zoom controls */}
              <div className="absolute bottom-6 right-4 flex flex-col gap-1">
                <button className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50">
                  <Plus className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50">
                  <Minus className="w-5 h-5" />
                </button>
              </div>

              {/* Prospect markers on map (in results view) */}
              {showResults && (
                <div className="absolute top-1/3 right-1/4 space-y-2">
                  {MOCK_PROSPECTS.slice(0, 3).map((prospect, i) => (
                    <button
                      key={prospect.id}
                      className={cn(
                        "px-3 py-1.5 bg-white border rounded-full text-sm font-medium shadow-sm",
                        expandedProspect === prospect.id
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      )}
                      style={{
                        transform: `translate(${i * 30}px, ${i * 40}px)`,
                      }}
                      onClick={() => setExpandedProspect(prospect.id)}
                    >
                      {prospect.score} {prospect.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

