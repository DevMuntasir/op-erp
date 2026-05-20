/**
 * Checks if a user is currently online based on their status field 
 * and the freshness of their lastSeen timestamp.
 */
export const isUserOnline = (user: any): boolean => {
  if (!user) return false;
  
  // If the status is explicitly offline, they are offline
  if (user.status === 'offline') return false;
  
  // If the status is online, verify with lastSeen timestamp
  if (user.status === 'online' && user.lastSeen) {
    try {
      const lastSeen = user.lastSeen.toDate ? user.lastSeen.toDate() : new Date(user.lastSeen);
      const now = new Date();
      // Consider offline if no heartbeat for more than 5 minutes
      const diffInMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
      return diffInMinutes < 5;
    } catch (e) {
      // Fallback to status if date parsing fails
      return user.status === 'online';
    }
  }
  
  return user.status === 'online';
};

/**
 * Formats the last seen time into a human-readable string.
 */
export const formatLastSeen = (user: any): string => {
  if (!user || !user.lastSeen) return 'Never';
  
  try {
    const lastSeen = user.lastSeen.toDate ? user.lastSeen.toDate() : new Date(user.lastSeen);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastSeen.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return lastSeen.toLocaleDateString();
  } catch (e) {
    return 'Unknown';
  }
};

const HALIFAX_TZ = 'America/Halifax';

/**
 * Formats a date or Firestore timestamp to a string in Halifax time.
 */
export const formatToHalifax = (date: any, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!date) return '';
  
  const d = date.toDate ? date.toDate() : new Date(date);
  
  return d.toLocaleString('en-CA', {
    ...options,
    timeZone: HALIFAX_TZ,
  });
};

/**
 * Formats a date to a short time string (e.g., 2:30 PM) in Halifax time.
 */
export const formatTimeHalifax = (date: any): string => {
  return formatToHalifax(date, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Formats a date to a full date and time string in Halifax time.
 */
export const formatDateTimeHalifax = (date: any): string => {
  return formatToHalifax(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Formats a date to a relative "last seen" string, calculated using Halifax local time comparison.
 */
export const formatLastSeenHalifax = (date: any): string => {
  if (!date) return 'Never';
  
  try {
    const lastSeen = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastSeen.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return formatToHalifax(lastSeen, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return 'Unknown';
  }
};
