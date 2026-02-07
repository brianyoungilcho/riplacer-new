import { useMemo, useState } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { US_CITIES, US_COUNTIES } from '@/data/us-cities';

interface StepTargetAccountProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type PatternEntry = {
  canonical: string;       // The ONE name shown in the UI
  aliases?: string[];      // Additional strings matched against user input
  source: 'city' | 'county';
};

const CATEGORY_PATTERNS: Record<string, PatternEntry[]> = {
  police: [
    { canonical: '{city} Police Department', aliases: ['{city} PD', '{city} Police Dept'], source: 'city' },
  ],
  sheriff: [
    { canonical: "{county} Sheriff's Office", aliases: ['{county} Sheriff', '{county} SO'], source: 'county' },
  ],
  fire: [
    { canonical: '{city} Fire Department', aliases: ['{city} FD', '{city} Fire Dept', '{city} Fire Rescue'], source: 'city' },
    { canonical: '{county} Fire District', aliases: ['{county} Fire'], source: 'county' },
  ],
  ems: [
    { canonical: '{city} EMS', aliases: ['{city} Emergency Medical Services', '{city} Ambulance'], source: 'city' },
    { canonical: '{county} Emergency Services', aliases: ['{county} EMS'], source: 'county' },
  ],
  schools_k12: [
    { canonical: '{city} School District', aliases: ['{city} ISD', '{city} Schools', '{city} USD', '{city} Public Schools'], source: 'city' },
    { canonical: '{county} Schools', aliases: ['{county} School District', '{county} Public Schools'], source: 'county' },
  ],
  city_gov: [
    { canonical: 'City of {city}', aliases: ['{city} City Hall', '{city} City Government'], source: 'city' },
  ],
  county_gov: [
    { canonical: '{county} County', aliases: ['{county} County Government'], source: 'county' },
  ],
  transit: [
    { canonical: '{city} Transit Authority', aliases: ['{city} Metro', '{city} Transit'], source: 'city' },
  ],
  utilities: [
    { canonical: '{city} Utilities', aliases: ['{city} Water Department', '{city} Public Utilities'], source: 'city' },
  ],
  hospitals: [
    { canonical: '{city} General Hospital', aliases: ['{city} Hospital', '{city} Medical Center'], source: 'city' },
    { canonical: '{county} Medical Center', aliases: ['{county} Hospital'], source: 'county' },
  ],
};

const getActivePatterns = (targetCategories: string[]) => {
  return targetCategories.flatMap((category) => CATEGORY_PATTERNS[category] || []);
};

const applyPattern = (pattern: string, replacements: { city?: string; county?: string }) => {
  return pattern
    .replace('{city}', replacements.city || '')
    .replace('{county}', replacements.county || '');
};

const INPUT_ALIASES: Record<string, string> = {
  la: 'los angeles',
  sf: 'san francisco',
  nyc: 'new york',
  dc: 'washington',
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const normalizeQuery = (value: string) => {
  const normalized = normalize(value);
  return INPUT_ALIASES[normalized] || normalized;
};

export function StepTargetAccount({ data, updateData, onNext, onBack }: StepTargetAccountProps) {
  const [input, setInput] = useState(data.targetAccount || '');
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  const activePatterns = useMemo(() => getActivePatterns(data.targetCategories), [data.targetCategories]);
  const hasPrereqs = data.states.length > 0 && activePatterns.length > 0;

  const suggestions = useMemo(() => {
    if (input.trim().length < 2) {
      return [];
    }

    if (!hasPrereqs) {
      return [];
    }

    const normalized = normalizeQuery(input);

    const cityPatterns = activePatterns.filter((entry) => entry.source === 'city');
    const countyPatterns = activePatterns.filter((entry) => entry.source === 'county');

    const cityMatches = US_CITIES.filter((city) => data.states.includes(city.state));
    const countyMatches = US_COUNTIES.filter((county) => data.states.includes(county.state));

    const candidates = new Map<string, { canonical: string; population: number }>();

    // Process city candidates
    for (const city of cityMatches) {
      for (const entry of cityPatterns) {
        const canonicalName = applyPattern(entry.canonical, { city: city.city });
        const allVariants = [canonicalName, ...(entry.aliases || []).map(alias => applyPattern(alias, { city: city.city }))];

        const matches = allVariants.some(variant => normalize(variant).includes(normalized));
        if (matches) {
          candidates.set(canonicalName, { canonical: canonicalName, population: city.population });
        }
      }
    }

    // Process county candidates
    for (const county of countyMatches) {
      for (const entry of countyPatterns) {
        const canonicalName = applyPattern(entry.canonical, { county: county.county });
        const allVariants = [canonicalName, ...(entry.aliases || []).map(alias => applyPattern(alias, { county: county.county }))];

        const matches = allVariants.some(variant => normalize(variant).includes(normalized));
        if (matches) {
          candidates.set(canonicalName, { canonical: canonicalName, population: 0 });
        }
      }
    }

    const uniqueCandidates = Array.from(candidates.values());
    uniqueCandidates.sort((a, b) => {
      const aStarts = normalize(a.canonical).startsWith(normalized);
      const bStarts = normalize(b.canonical).startsWith(normalized);
      if (aStarts !== bStarts) {
        return aStarts ? -1 : 1;
      }
      if (a.population !== b.population) {
        return b.population - a.population;
      }
      return a.canonical.localeCompare(b.canonical);
    });

    return uniqueCandidates.slice(0, 6).map((candidate) => candidate.canonical);
  }, [activePatterns, data.states, hasPrereqs, input]);

  const canContinue = input.trim().length >= 2;

  const handleContinue = () => {
    if (!canContinue) return;
    updateData({ targetAccount: input.trim() });
    onNext();
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10">
        <div className="w-full max-w-lg mx-auto relative z-10">
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">
            Name your first Rip &amp; Replace target
          </h1>
          <p className="text-gray-500 mb-8">
            Which account do you want to win?
          </p>

          <div className="space-y-3">
            <Input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSelectedSuggestion(null);
              }}
              placeholder="e.g., Austin PD"
              className="h-14 sm:h-12 text-base border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-400"
              autoFocus
            />

            {suggestions.length > 0 && (
              <div className="border border-gray-200 rounded-xl bg-white p-2">
                <p className="px-3 py-1 text-xs text-gray-400 uppercase tracking-wide">
                  Suggested targets
                </p>
                <div className="flex flex-col">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        setSelectedSuggestion(suggestion);
                      }}
                      className={cn(
                        "text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        selectedSuggestion === suggestion
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {input.trim().length >= 2 && !hasPrereqs && (
              <p className="text-sm text-gray-400">
                Add your territory and buyer types to see suggestions.
              </p>
            )}
            {input.trim().length >= 2 && hasPrereqs && suggestions.length === 0 && (
              <p className="text-sm text-gray-400">
                No suggestions yet. Free text works great here.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 border-t border-gray-200 bg-white">
        <div className="max-w-lg mx-auto flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="flex-1 h-14 sm:h-12 text-base font-medium rounded-xl"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="flex-1 h-14 sm:h-12 text-base font-medium rounded-xl"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
