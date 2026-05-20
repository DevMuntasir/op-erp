import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { useAuth } from '@/src/App';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Search, Plus, Navigation, Star, Info, RefreshCw, Lock, ExternalLink, Phone, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CallLoggerDialog } from '@/src/components/calls/CallLogger';
import { logCallAutomatically } from '@/src/lib/calls';
import { Lead } from '@/src/types';
import { createLead } from '@/src/api/endpoints/leads.api';

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  geometry?: {
    location: google.maps.LatLng;
  };
  formatted_phone_number?: string;
  website?: string;
}

export const LeadFinder = () => {
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [invalidKey, setInvalidKey] = useState(false);
  const [billingDisabled, setBillingDisabled] = useState(false);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [localKeyOverride, setLocalKeyOverride] = useState('');
  const [pagination, setPagination] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const isAppendingRef = useRef(false);

  const envApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  // Use the validated key provided by the user
  const validatedKey = 'AIzaSyCiJkfeDvQv0s_GTLfe1NjCg98wzqk-LCo';
  
  // Robust sanitization to handle common copy-paste errors
  const sanitize = (key: string | undefined): string => {
    if (!key) return '';
    const cleanKey = key
      .replace(/^VITE_GOOGLE_MAPS_API_KEY=/, '')
      .replace(/^key=/, '')
      .replace(/['"]/g, '')
      .trim();
    
    // If it looks like a variable placeholder or is clearly not a Google key, ignore it
    if (cleanKey.includes('MY_') || cleanKey.includes('YOUR_') || cleanKey.length < 20 || !cleanKey.startsWith('AIza')) {
      return '';
    }
    return cleanKey;
  };

  // Prioritize the validated key if the environment one is missing or invalid
  const apiKey = sanitize(localKeyOverride) || sanitize(envApiKey) || validatedKey;

  useEffect(() => {
    // Reset states when key changes
    setInvalidKey(false);
    setBillingDisabled(false);
    setApiKeyMissing(false);
    
    // Global function for GM auth failure
    (window as any).gm_authFailure = () => {
      console.error("Google Maps Authentication Failure Detected for key:", apiKey.substring(0, 8) + '...');
      setInvalidKey(true);
    };

    if (!apiKey) {
      setApiKeyMissing(true);
      return;
    }

    const initMap = async () => {
      try {
        setOptions({
          key: apiKey,
          v: 'weekly',
        });

        // Clear existing map state
        setMap(null);
        
        await importLibrary('maps');
        await importLibrary('places');
        
        if (mapRef.current) {
          // Initialize a minimal map for state management (needed by PlacesService)
          const initialMap = new google.maps.Map(mapRef.current, {
            center: { lat: 44.6488, lng: -63.5752 },
            zoom: 13,
            disableDefaultUI: true,
          });

          setMap(initialMap);
          setInvalidKey(false);
        }
      } catch (e: any) {
        console.error("Google Maps Load Error:", e);
        if (e.message?.includes('BillingNotEnabled')) {
          setBillingDisabled(true);
        } else if (!invalidKey) {
          toast.error("Error loading Google Maps script");
        }
      }
    };

    initMap();
  }, [apiKey]);

  const searchLeads = (queryStr: string) => {
    if (!map || !queryStr) return;

    // Reset for a fresh search
    isAppendingRef.current = false;
    setLoading(true);
    setBillingDisabled(false);
    setPlaces([]);
    setPagination(null);
    
    // Clear old markers
    markers.forEach(m => m.setMap(null));
    setMarkers([]);

    try {
      const service = new google.maps.places.PlacesService(map);
      
      service.textSearch({
        query: queryStr,
        location: map.getCenter(),
        radius: 50000 
      }, (results, status, paginationObj) => {
        setLoading(false);
        setLoadingMore(false);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedResults = results.map(r => ({
            place_id: r.place_id!,
            name: r.name!,
            formatted_address: r.formatted_address,
            vicinity: r.vicinity,
            rating: r.rating,
            user_ratings_total: r.user_ratings_total,
            types: r.types,
            geometry: {
              location: r.geometry!.location!
            }
          }));
          
          if (isAppendingRef.current) {
            setPlaces(prev => {
              const existingIds = new Set(prev.map(p => p.place_id));
              const uniqueNew = formattedResults.filter(p => !existingIds.has(p.place_id));
              return [...prev, ...uniqueNew];
            });
          } else {
            setPlaces(formattedResults);
          }
          
          // Store the latest pagination object so Load More can use it
          setPagination(paginationObj || null);

          // Add new markers
          const newMarkers = results.map(r => {
            const marker = new google.maps.Marker({
              position: r.geometry!.location,
              map: map,
              title: r.name,
              animation: isAppendingRef.current ? undefined : google.maps.Animation.DROP
            });

            const infoWindow = new google.maps.InfoWindow({
              content: `<div class="p-2 font-sans max-w-[200px]">
                <h3 class="font-bold text-zinc-900 text-sm truncate">${r.name}</h3>
                <p class="text-[10px] text-zinc-500 mt-1">${r.formatted_address || r.vicinity}</p>
                <div class="mt-2 pt-2 border-t border-zinc-100 flex justify-between items-center">
                  <span class="text-[10px] font-bold text-emerald-600">${r.rating ? '★ ' + r.rating : ''}</span>
                </div>
              </div>`
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });

            return marker;
          });
          
          setMarkers(prev => {
            if (isAppendingRef.current) {
              return [...prev, ...newMarkers];
            } else {
              prev.forEach(m => m.setMap(null));
              return newMarkers;
            }
          });

          if (results.length > 0 && !isAppendingRef.current) {
            const bounds = new google.maps.LatLngBounds();
            results.forEach(r => bounds.extend(r.geometry!.location!));
            map.fitBounds(bounds);
          }
        } else if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
          setBillingDisabled(true);
        } else if (!isAppendingRef.current) {
          toast.error("No results found for this area.");
        }
      });
    } catch (e: any) {
      setLoading(false);
      setLoadingMore(false);
      toast.error("Error searching for places");
    }
  };

  const handleLoadMore = () => {
    if (!pagination || !pagination.hasNextPage || loadingMore) {
      if (pagination && !pagination.hasNextPage) {
        toast.info("No more results available from Google.");
      }
      return;
    }
    
    isAppendingRef.current = true;
    setLoadingMore(true);
    pagination.nextPage();
  };

  const addAsLead = async (place: PlaceResult) => {
    if (!user) return;

    try {
      // Get more details for the place (phone, website)
      const service = new google.maps.places.PlacesService(map!);
      service.getDetails({
        placeId: place.place_id,
        fields: ['formatted_phone_number', 'website', 'formatted_address']
      }, async (details, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && details) {
          await createLead({
            name: place.name,
            email: '', // Places API doesn't provide email
            phone: details.formatted_phone_number || '',
            company: place.name,
            jobTitle: 'Business Owner',
            address: details.formatted_address || place.formatted_address || place.vicinity || '',
            website: details.website || '',
            status: 'new',
            source: 'Google Maps Search',
            notes: `Found via Lead Finder. Rating: ${place.rating} (${place.user_ratings_total} reviews). Types: ${place.types?.join(', ')}`,
          });

          toast.success(`${place.name} added to leads!`);
        } else {
          toast.error("Failed to get place details.");
        }
      });
    } catch (error) {
      console.error("Error adding lead:", error);
      toast.error("Failed to add lead.");
    }
  };

  const handleCallNow = (place: PlaceResult) => {
    if (!user) return;
    
    // First try to use the phone if we already have it
    if (place.formatted_phone_number) {
      logCallAutomatically(user, { name: place.name, phone: place.formatted_phone_number });
      window.open(`tel:${place.formatted_phone_number}`, '_self');
      return;
    }

    // Otherwise fetch details first
    const service = new google.maps.places.PlacesService(map!);
    service.getDetails({
      placeId: place.place_id,
      fields: ['formatted_phone_number']
    }, (details, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && details?.formatted_phone_number) {
        logCallAutomatically(user, { name: place.name, phone: details.formatted_phone_number });
        window.open(`tel:${details.formatted_phone_number}`, '_self');
      } else {
        toast.error("Phone number not available for this business.");
      }
    });
  };

  if (apiKeyMissing || invalidKey || billingDisabled) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-zinc-50">
        <Card className="max-w-md w-full border-zinc-200 shadow-2xl overflow-hidden">
          <CardHeader className="bg-white border-b border-zinc-100 pb-6">
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-rose-600" />
            </div>
            <CardTitle className="text-center text-xl font-bold tracking-tight">
              {billingDisabled ? 'Billing Required' : invalidKey ? 'Invalid API Key' : 'Configuration Required'}
            </CardTitle>
            <CardDescription className="text-center text-zinc-500">
              {billingDisabled 
                ? "Google Cloud Platform billing is disabled."
                : "Unable to initialize Google Maps services."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                <p className="text-sm font-medium text-zinc-900 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  What happened?
                </p>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {billingDisabled 
                    ? "The Google Maps Places API requires an active billing account linked to your project. Even if you're within the free usage tier, your account must be verified."
                    : invalidKey 
                    ? "The API key being used is not authorized. This often happens if the key is restricted to a different domain or the required APIs (Maps/Places) aren't enabled."
                    : "To find potential leads via search, a Google Cloud API key must be configured in your environment settings."}
                </p>
              </div>

              {billingDisabled && (
                <a 
                  href="https://console.cloud.google.com/project/_/billing/enable" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: 'default' }), 
                    "w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white font-bold gap-2"
                  )}
                >
                  <ExternalLink className="w-4 h-4" />
                  Enable Billing Now
                </a>
              )}

              <div className="pt-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3" aria-hidden="true">Debug Information</p>
                <div className="space-y-3 p-3 bg-white rounded-lg border border-zinc-100">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500">Current Domain:</span>
                    <code className="text-zinc-900 font-mono bg-zinc-50 px-1 rounded">{window.location.hostname}</code>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500">API Key Usage:</span>
                    <code className="text-zinc-900 font-mono bg-zinc-50 px-1 rounded">
                      {apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'None'}
                    </code>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-xs text-zinc-500 text-center">Test a different key temporarily:</p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Paste AIza... key" 
                    className="h-9 text-xs font-mono"
                    value={localKeyOverride}
                    onChange={(e) => setLocalKeyOverride(e.target.value)}
                  />
                  <Button 
                    variant="outline"
                    size="sm" 
                    className="h-9 px-4 shrink-0"
                    onClick={() => window.location.reload()}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>

            <Button 
              variant="ghost" 
              className="w-full text-zinc-400 hover:text-zinc-900 text-xs gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-3 h-3" />
              Reload Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-zinc-50/50 overflow-hidden">
      {/* Search Header */}
      <div className="p-4 bg-white border-b border-zinc-200 shrink-0 shadow-sm z-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Search businesses (e.g. 'Software Companies in London', 'Real Estate')..." 
              className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white transition-all shadow-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchLeads(searchQuery)}
            />
          </div>
          <Button 
            onClick={() => searchLeads(searchQuery)} 
            disabled={loading || !searchQuery}
            className="h-11 px-8 bg-zinc-900 hover:bg-zinc-800 text-white font-bold shrink-0 shadow-lg shadow-zinc-200"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Navigation className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Searching...' : 'Search Leads'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Map Section - Hidden from UI but active for Places API bias */}
        <div className="h-0 w-0 absolute overflow-hidden pointer-events-none opacity-0" aria-hidden="true">
          <div ref={mapRef} className="absolute inset-0" />
        </div>

        {/* Results Section */}
        <div className="flex-1 bg-white flex flex-col min-h-0">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div className="space-y-0.5">
              <h3 className="font-bold text-zinc-900">Prospects</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                {places.length} results found
              </p>
            </div>
            {places.length > 0 && (
              <Badge variant="outline" className="text-xs border-zinc-200 bg-zinc-50 font-medium">
                {searchQuery || 'Current View'}
              </Badge>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-3 max-w-7xl mx-auto w-full">
              {places.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {places.map((place) => (
                      <Card 
                        key={place.place_id} 
                        className="group border-zinc-100 shadow-none hover:border-zinc-900/10 hover:shadow-lg hover:shadow-zinc-100 transition-all duration-300 overflow-hidden relative"
                      >
                        {/* Hover state indicator */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1 min-w-0">
                              <h4 className="font-bold text-zinc-900 leading-tight group-hover:text-zinc-900 transition-colors truncate">
                                {place.name}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                <MapPin className="w-3 h-3 shrink-0 text-zinc-400" />
                                <span className="truncate">{place.formatted_address || place.vicinity}</span>
                              </div>
                            </div>
                            
                            {place.rating && (
                              <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg shrink-0 border border-amber-100">
                                <Star className="w-3 h-3 fill-current" />
                                <span className="text-[11px] font-black">{place.rating}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {place.types?.slice(0, 2).map(type => (
                              <span key={type} className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest border border-zinc-100 px-1.5 py-0.5 rounded bg-zinc-50/50">
                                {type.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <Button 
                              onClick={() => addAsLead(place)}
                              disabled={loading}
                              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold gap-2 shadow-sm h-10"
                            >
                              <Plus className="w-4 h-4" />
                              Add Lead
                            </Button>
                            <Button 
                              variant="outline" 
                              className="w-full gap-2 border-emerald-100 text-emerald-700 hover:bg-emerald-50 text-sm font-bold h-10"
                              onClick={() => handleCallNow(place)}
                            >
                              <Phone className="w-4 h-4" />
                              Call Now
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {pagination?.hasNextPage && (
                    <div className="flex justify-center py-8">
                      <Button 
                        variant="outline" 
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="h-11 px-8 border-zinc-200 hover:bg-zinc-50 font-bold gap-2"
                      >
                        {loadingMore ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        {loadingMore ? 'Loading More...' : 'Load More Results'}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center px-8">
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-zinc-50/50">
                    <Navigation className="w-8 h-8 text-zinc-300" />
                  </div>
                  <h4 className="font-bold text-zinc-900 mb-2">Ready to expand?</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Search for specific businesses or sectors in your target area to identify high-quality prospects.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
