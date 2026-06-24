// Haversine formula — great-circle distance in km between two points on a sphere.
// Input angles in degrees; output rounded to one decimal place.
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

module.exports = { distanceKm };
