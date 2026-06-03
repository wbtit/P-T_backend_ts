import geoip from "geoip-lite";

export interface GeoLocation {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
}

export const getGeoLocation = (ip: string): GeoLocation | null => {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") {
    return null;
  }
  
  const geo = geoip.lookup(ip);
  if (!geo) {
    return null;
  }

  return {
    country: geo.country || "Unknown",
    city: geo.city || "Unknown",
    latitude: geo.ll[0],
    longitude: geo.ll[1],
  };
};
