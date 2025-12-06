// US Census Regions and States
export const US_REGIONS = {
  'Northeast': {
    states: ['Connecticut', 'Maine', 'Massachusetts', 'New Hampshire', 'New Jersey', 'New York', 'Pennsylvania', 'Rhode Island', 'Vermont']
  },
  'Midwest': {
    states: ['Illinois', 'Indiana', 'Iowa', 'Kansas', 'Michigan', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'Ohio', 'South Dakota', 'Wisconsin']
  },
  'South': {
    states: ['Alabama', 'Arkansas', 'Delaware', 'Florida', 'Georgia', 'Kentucky', 'Louisiana', 'Maryland', 'Mississippi', 'North Carolina', 'Oklahoma', 'South Carolina', 'Tennessee', 'Texas', 'Virginia', 'West Virginia']
  },
  'West': {
    states: ['Alaska', 'Arizona', 'California', 'Colorado', 'Hawaii', 'Idaho', 'Montana', 'Nevada', 'New Mexico', 'Oregon', 'Utah', 'Washington', 'Wyoming']
  }
} as const;

export type USRegion = keyof typeof US_REGIONS;

// State abbreviations
export const STATE_ABBREVIATIONS: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// Major cities by state (alphabetically sorted)
export const CITIES_BY_STATE: Record<string, string[]> = {
  'Alabama': ['Birmingham', 'Huntsville', 'Mobile', 'Montgomery', 'Tuscaloosa'].sort(),
  'Alaska': ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Wasilla'].sort(),
  'Arizona': ['Chandler', 'Gilbert', 'Glendale', 'Mesa', 'Phoenix', 'Scottsdale', 'Tempe', 'Tucson'].sort(),
  'Arkansas': ['Fayetteville', 'Fort Smith', 'Jonesboro', 'Little Rock', 'Springdale'].sort(),
  'California': ['Anaheim', 'Bakersfield', 'Fresno', 'Irvine', 'Long Beach', 'Los Angeles', 'Oakland', 'Riverside', 'Sacramento', 'San Diego', 'San Francisco', 'San Jose', 'Santa Ana', 'Stockton'].sort(),
  'Colorado': ['Aurora', 'Boulder', 'Colorado Springs', 'Denver', 'Fort Collins', 'Lakewood', 'Pueblo', 'Thornton'].sort(),
  'Connecticut': ['Bridgeport', 'Hartford', 'New Haven', 'Norwalk', 'Stamford', 'Waterbury'].sort(),
  'Delaware': ['Dover', 'Newark', 'Wilmington'].sort(),
  'Florida': ['Cape Coral', 'Fort Lauderdale', 'Hialeah', 'Jacksonville', 'Miami', 'Orlando', 'St. Petersburg', 'Tampa', 'Tallahassee'].sort(),
  'Georgia': ['Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah'].sort(),
  'Hawaii': ['Hilo', 'Honolulu', 'Kailua', 'Kapolei', 'Pearl City'].sort(),
  'Idaho': ['Boise', 'Idaho Falls', 'Meridian', 'Nampa', 'Pocatello'].sort(),
  'Illinois': ['Aurora', 'Chicago', 'Joliet', 'Naperville', 'Peoria', 'Rockford', 'Springfield'].sort(),
  'Indiana': ['Evansville', 'Fort Wayne', 'Gary', 'Indianapolis', 'South Bend'].sort(),
  'Iowa': ['Cedar Rapids', 'Davenport', 'Des Moines', 'Iowa City', 'Sioux City'].sort(),
  'Kansas': ['Kansas City', 'Lawrence', 'Olathe', 'Overland Park', 'Topeka', 'Wichita'].sort(),
  'Kentucky': ['Bowling Green', 'Covington', 'Lexington', 'Louisville', 'Owensboro'].sort(),
  'Louisiana': ['Baton Rouge', 'Lafayette', 'New Orleans', 'Shreveport'].sort(),
  'Maine': ['Auburn', 'Augusta', 'Bangor', 'Lewiston', 'Portland'].sort(),
  'Maryland': ['Annapolis', 'Baltimore', 'Frederick', 'Gaithersburg', 'Rockville'].sort(),
  'Massachusetts': ['Boston', 'Cambridge', 'Lowell', 'Springfield', 'Worcester'].sort(),
  'Michigan': ['Ann Arbor', 'Detroit', 'Flint', 'Grand Rapids', 'Lansing', 'Sterling Heights', 'Warren'].sort(),
  'Minnesota': ['Bloomington', 'Brooklyn Park', 'Duluth', 'Minneapolis', 'Rochester', 'Saint Paul'].sort(),
  'Mississippi': ['Biloxi', 'Gulfport', 'Hattiesburg', 'Jackson', 'Southaven'].sort(),
  'Missouri': ['Columbia', 'Independence', 'Kansas City', 'Springfield', 'St. Louis'].sort(),
  'Montana': ['Billings', 'Bozeman', 'Great Falls', 'Helena', 'Missoula'].sort(),
  'Nebraska': ['Bellevue', 'Grand Island', 'Lincoln', 'Omaha'].sort(),
  'Nevada': ['Henderson', 'Las Vegas', 'North Las Vegas', 'Reno', 'Sparks'].sort(),
  'New Hampshire': ['Concord', 'Dover', 'Manchester', 'Nashua', 'Rochester'].sort(),
  'New Jersey': ['Elizabeth', 'Jersey City', 'Newark', 'Paterson', 'Trenton'].sort(),
  'New Mexico': ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Roswell', 'Santa Fe'].sort(),
  'New York': ['Albany', 'Buffalo', 'New York City', 'Rochester', 'Syracuse', 'Yonkers'].sort(),
  'North Carolina': ['Charlotte', 'Durham', 'Fayetteville', 'Greensboro', 'Raleigh', 'Wilmington', 'Winston-Salem'].sort(),
  'North Dakota': ['Bismarck', 'Fargo', 'Grand Forks', 'Minot', 'West Fargo'].sort(),
  'Ohio': ['Akron', 'Cincinnati', 'Cleveland', 'Columbus', 'Dayton', 'Toledo'].sort(),
  'Oklahoma': ['Broken Arrow', 'Edmond', 'Norman', 'Oklahoma City', 'Tulsa'].sort(),
  'Oregon': ['Beaverton', 'Bend', 'Eugene', 'Gresham', 'Hillsboro', 'Portland', 'Salem'].sort(),
  'Pennsylvania': ['Allentown', 'Erie', 'Harrisburg', 'Philadelphia', 'Pittsburgh', 'Reading'].sort(),
  'Rhode Island': ['Cranston', 'Pawtucket', 'Providence', 'Warwick', 'Woonsocket'].sort(),
  'South Carolina': ['Charleston', 'Columbia', 'Greenville', 'Mount Pleasant', 'North Charleston'].sort(),
  'South Dakota': ['Aberdeen', 'Brookings', 'Rapid City', 'Sioux Falls', 'Watertown'].sort(),
  'Tennessee': ['Chattanooga', 'Clarksville', 'Knoxville', 'Memphis', 'Nashville'].sort(),
  'Texas': ['Arlington', 'Austin', 'Corpus Christi', 'Dallas', 'El Paso', 'Fort Worth', 'Houston', 'Laredo', 'Lubbock', 'Plano', 'San Antonio'].sort(),
  'Utah': ['Ogden', 'Orem', 'Provo', 'Salt Lake City', 'Sandy', 'West Jordan', 'West Valley City'].sort(),
  'Vermont': ['Burlington', 'Essex', 'Rutland', 'South Burlington'].sort(),
  'Virginia': ['Alexandria', 'Arlington', 'Chesapeake', 'Hampton', 'Newport News', 'Norfolk', 'Richmond', 'Virginia Beach'].sort(),
  'Washington': ['Bellevue', 'Kent', 'Seattle', 'Spokane', 'Tacoma', 'Vancouver'].sort(),
  'West Virginia': ['Charleston', 'Huntington', 'Morgantown', 'Parkersburg', 'Wheeling'].sort(),
  'Wisconsin': ['Green Bay', 'Kenosha', 'Madison', 'Milwaukee', 'Racine'].sort(),
  'Wyoming': ['Casper', 'Cheyenne', 'Gillette', 'Laramie', 'Rock Springs'].sort()
};

// Target sectors/buyer categories
export const TARGET_SECTORS = [
  { id: 'police', name: 'Police Departments', description: 'Law enforcement agencies' },
  { id: 'sheriff', name: 'Sheriff Offices', description: 'County sheriff departments' },
  { id: 'fire', name: 'Fire Departments', description: 'Fire and rescue services' },
  { id: 'ems', name: 'EMS/Ambulance', description: 'Emergency medical services' },
  { id: 'k12', name: 'K-12 Schools', description: 'Public school districts' },
  { id: 'higher_ed', name: 'Higher Education', description: 'Universities and colleges' },
  { id: 'city', name: 'City Government', description: 'Municipal offices' },
  { id: 'county', name: 'County Government', description: 'County-level agencies' },
  { id: 'state', name: 'State Agencies', description: 'State departments' },
  { id: 'transit', name: 'Public Transit', description: 'Transportation authorities' },
  { id: 'utilities', name: 'Public Utilities', description: 'Water, power, gas' },
  { id: 'parks', name: 'Parks & Recreation', description: 'Parks departments' },
];

// Pre-defined filter options
export const FILTER_OPTIONS = [
  { id: 'size_small', label: '<100 employees', category: 'size' },
  { id: 'size_medium', label: '100-500 employees', category: 'size' },
  { id: 'size_large', label: '>500 employees', category: 'size' },
  { id: 'contract_expiring', label: 'Contract Expiring <6 months', category: 'opportunity' },
  { id: 'contract_expiring_year', label: 'Contract Expiring <12 months', category: 'opportunity' },
  { id: 'new_leadership', label: 'New Leadership', category: 'opportunity' },
  { id: 'budget_increase', label: 'Budget Increase', category: 'opportunity' },
  { id: 'rfp_active', label: 'Active RFP', category: 'opportunity' },
  { id: 'competitor_issues', label: 'Competitor Issues Reported', category: 'opportunity' },
];

// Mock prospect data
export interface Prospect {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  riplaceScore: number;
  contractValue: number;
  primaryReason: string;
  reasonTag: string;
  currentVendor?: string;
  contractExpiry?: string;
  decisionMaker?: string;
  riplaceAngle: string;
  sources: { title: string; url: string }[];
  lastUpdated: string;
  employeeCount?: number;
  notes?: string;
}

export const MOCK_PROSPECTS: Prospect[] = [
  {
    id: '1',
    name: 'Havensville PD',
    type: 'Police Department',
    address: '100 Main Street',
    city: 'Havensville',
    state: 'Kansas',
    lat: 39.5,
    lng: -96.1,
    riplaceScore: 85,
    contractValue: 500000,
    primaryReason: 'Contract with incumbent expires in 4 months, budget approved for new solution',
    reasonTag: 'Contract Expiring in <6 months',
    currentVendor: 'ShotSpotter',
    contractExpiry: '2025-04-15',
    decisionMaker: 'Chief Michael Rodriguez',
    riplaceAngle: 'Havensville PD has expressed frustration with ShotSpotter\'s false positive rates in recent city council meetings. Their contract expires April 2025 and the city has allocated $550K in their FY2025 budget for "gunshot detection modernization." Chief Rodriguez recently attended a conference where Flock Safety presented.',
    sources: [
      { title: 'City Council Meeting Minutes - Oct 2024', url: 'https://havensville.gov/meetings/2024-10' },
      { title: 'FY2025 Budget Document', url: 'https://havensville.gov/budget/fy2025' },
      { title: 'Police Chiefs Conference Attendee List', url: 'https://policechiefs.org/conference/2024' },
    ],
    lastUpdated: '2024-12-05',
    employeeCount: 45,
  },
  {
    id: '2',
    name: 'Tontown PD',
    type: 'Police Department',
    address: '250 Oak Avenue',
    city: 'Tontown',
    state: 'Arkansas',
    lat: 36.1,
    lng: -94.2,
    riplaceScore: 75,
    contractValue: 250000,
    primaryReason: 'New Police Chief appointed, reviewing all vendor relationships',
    reasonTag: 'New Chief in town',
    currentVendor: 'Axon',
    decisionMaker: 'Chief Sarah Johnson',
    riplaceAngle: 'New Chief Sarah Johnson was appointed 3 months ago and has publicly stated she wants to "modernize the department\'s technology stack." She previously worked at a department that used Flock Safety and spoke positively about the experience in a local news interview.',
    sources: [
      { title: 'New Chief Announcement - Local News', url: 'https://tontownnews.com/new-chief' },
      { title: 'Chief Johnson Interview', url: 'https://tontownnews.com/johnson-interview' },
    ],
    lastUpdated: '2024-12-04',
    employeeCount: 28,
  },
  {
    id: '3',
    name: 'Chelsea PD',
    type: 'Police Department',
    address: '500 Government Center',
    city: 'Chelsea',
    state: 'Massachusetts',
    lat: 42.4,
    lng: -71.0,
    riplaceScore: 75,
    contractValue: 125000,
    primaryReason: 'Current vendor facing PR issues after data breach',
    reasonTag: 'Competitor under attack in PR',
    currentVendor: 'Motorola Solutions',
    decisionMaker: 'Captain James O\'Brien',
    riplaceAngle: 'Motorola Solutions experienced a significant data breach last month affecting several of their law enforcement customers. Chelsea PD has been named in local press as potentially affected. City councilors are asking questions about data security.',
    sources: [
      { title: 'Motorola Data Breach Report', url: 'https://securityweek.com/motorola-breach' },
      { title: 'Chelsea City Council Questions', url: 'https://chelsea.gov/council/security-inquiry' },
    ],
    lastUpdated: '2024-12-03',
    employeeCount: 52,
  },
  {
    id: '4',
    name: 'Springfield Fire Department',
    type: 'Fire Department',
    address: '123 Fire Station Road',
    city: 'Springfield',
    state: 'Illinois',
    lat: 39.8,
    lng: -89.6,
    riplaceScore: 68,
    contractValue: 180000,
    primaryReason: 'Expanding coverage area, need additional capacity',
    reasonTag: 'Expansion planned',
    decisionMaker: 'Fire Chief Robert Williams',
    riplaceAngle: 'Springfield annexed two neighboring townships and needs to expand their emergency response infrastructure. Current system cannot scale to meet new coverage requirements.',
    sources: [
      { title: 'Township Annexation Approval', url: 'https://springfield.gov/annexation' },
    ],
    lastUpdated: '2024-12-02',
    employeeCount: 120,
  },
  {
    id: '5',
    name: 'Riverside School District',
    type: 'K-12 Schools',
    address: '800 Education Blvd',
    city: 'Riverside',
    state: 'California',
    lat: 33.9,
    lng: -117.4,
    riplaceScore: 72,
    contractValue: 320000,
    primaryReason: 'Federal safety grant received, must spend by Q2',
    reasonTag: 'Grant funding available',
    currentVendor: 'Verkada',
    decisionMaker: 'Superintendent Dr. Lisa Chen',
    riplaceAngle: 'District received $400K federal school safety grant that must be allocated by March 2025. Current Verkada system has had reliability issues and parents have complained at board meetings.',
    sources: [
      { title: 'Federal Grant Announcement', url: 'https://ed.gov/grants/riverside' },
      { title: 'School Board Meeting - Parent Complaints', url: 'https://riverside.k12.ca.us/board/nov2024' },
    ],
    lastUpdated: '2024-12-01',
    employeeCount: 450,
  },
];

// Mock competitors based on sector
export const COMPETITORS_BY_SECTOR: Record<string, string[]> = {
  'police': ['Axon', 'Motorola Solutions', 'ShotSpotter', 'Verkada', 'Genetec', 'Milestone'],
  'sheriff': ['Axon', 'Motorola Solutions', 'Tyler Technologies', 'Genetec'],
  'fire': ['ESO', 'ImageTrend', 'Motorola Solutions', 'Tyler Technologies'],
  'ems': ['ESO', 'ImageTrend', 'Zoll', 'Stryker'],
  'k12': ['Verkada', 'Rhombus', 'Genetec', 'Avigilon', 'Milestone'],
  'higher_ed': ['Verkada', 'Genetec', 'Avigilon', 'Milestone', 'Axis'],
  'city': ['Tyler Technologies', 'Oracle', 'SAP', 'Workday'],
  'county': ['Tyler Technologies', 'Oracle', 'SAP', 'Infor'],
  'state': ['Oracle', 'SAP', 'Workday', 'Deloitte'],
  'transit': ['Motorola Solutions', 'Conduent', 'Cubic', 'Trapeze'],
  'utilities': ['Oracle', 'SAP', 'Itron', 'Sensus'],
  'parks': ['CivicRec', 'ActiveNet', 'RecDesk', 'PerfectMind'],
};

