import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { reverseGeocode } from '@/src/lib/geocoding';

interface FormattedAddressProps {
  address?: string | null;
}

export const FormattedAddress: React.FC<FormattedAddressProps> = ({ address }) => {
  const [displayAddress, setDisplayAddress] = useState(address || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setDisplayAddress('');
      return;
    }

    const loadAddress = async () => {
      setIsLoading(true);
      const formatted = await reverseGeocode(address);
      setDisplayAddress(formatted);
      setIsLoading(false);
    };

    loadAddress();
  }, [address]);

  if (!displayAddress && !isLoading) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600">
      <MapPin className="w-4 h-4" />
      {isLoading ? <span className="animate-pulse">Loading location...</span> : displayAddress}
    </div>
  );
};
