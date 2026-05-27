const CACHE = new Map<string, string>();

const isCoordinates = (str: string): boolean => {
  const coordRegex = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
  return coordRegex.test(str.trim());
};

const parseCoordinates = (str: string): [number, number] | null => {
  const parts = str.trim().split(',').map(p => p.trim());
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
  }
  return null;
};

export const reverseGeocode = async (address: string): Promise<string> => {
  if (!address) return address;

  if (CACHE.has(address)) {
    return CACHE.get(address)!;
  }

  if (!isCoordinates(address)) {
    return address;
  }

  const coords = parseCoordinates(address);
  if (!coords) return address;

  const [lat, lng] = coords;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );

    if (!response.ok) {
      return address;
    }

    const data = await response.json();
    const formattedAddress = data.address?.country || data.name || address;
    CACHE.set(address, formattedAddress);
    return formattedAddress;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return address;
  }
};
