import geoip from 'geoip-lite';

export function getGeoFromIp(ip: string): { country: string; city: string; latitude: number; longitude: number } | null {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return null;
  }

  const geo = geoip.lookup(ip);
  if (!geo) return null;

  return {
    country: geo.country,
    city: geo.city,
    latitude: geo.ll[0],
    longitude: geo.ll[1],
  };
}
