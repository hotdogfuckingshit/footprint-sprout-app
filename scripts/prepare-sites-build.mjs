import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(new URL(path, `file:///${root.replace(/\\/g, '/')}`), 'utf8');

const html = read('dist/index.html');
const manifest = read('public/manifest.webmanifest');
const icon = read('public/app-icon.svg');
const serviceWorker = read('public/sw.js');
const hosting = read('.openai/hosting.json');

mkdirSync(new URL('../dist/server/', import.meta.url), { recursive: true });
mkdirSync(new URL('../dist/.openai/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/.openai/hosting.json', import.meta.url), hosting);

const server = `
const HTML = ${JSON.stringify(html)};
const MANIFEST = ${JSON.stringify(manifest)};
const APP_ICON = ${JSON.stringify(icon)};
const SERVICE_WORKER = ${JSON.stringify(serviceWorker)};

const placeTypeMap = {
  all: [],
  food: ['restaurant', 'cafe', 'bakery', 'meal_takeaway'],
  scenic: ['tourist_attraction', 'park', 'museum'],
  cafe: ['cafe'],
  walk: ['park', 'tourist_attraction', 'library', 'museum'],
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function normalizeGooglePlace(place, index) {
  const location = place.location || {};
  const displayName = place.displayName?.text || place.name || \`Place \${index + 1}\`;
  return {
    id: place.id || \`google-\${index}\`,
    source: 'google',
    name: displayName,
    address: place.formattedAddress || '',
    latitude: location.latitude,
    longitude: location.longitude,
    category: place.primaryType || place.types?.[0] || 'place',
    types: place.types || [],
    googleMapsUri: place.googleMapsUri || null,
  };
}

function normalizeOsmElement(element, index) {
  const tags = element.tags || {};
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  const category = tags.amenity || tags.shop || tags.tourism || tags.leisure || 'place';
  return {
    id: \`osm-\${element.type}-\${element.id}\`,
    source: 'openstreetmap',
    name: tags.name || tags['name:zh'] || tags['name:en'] || \`\${category} \${index + 1}\`,
    address: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
    latitude,
    longitude,
    category,
    types: Object.keys(tags).filter((key) => ['amenity', 'shop', 'tourism', 'leisure'].includes(key)).map((key) => tags[key]),
    googleMapsUri: \`https://www.google.com/maps/search/?api=1&query=\${latitude},\${longitude}\`,
  };
}

async function nearbyPlaces(request, env) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  const layer = String(url.searchParams.get('layer') || 'all');
  const radius = Math.min(1500, Math.max(250, Number(url.searchParams.get('radius') || 900)));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ ok: false, error: 'lat and lon are required' }, 400);
  }

  const apiKey = env.GOOGLE_MAPS_API_KEY || env.VITE_GOOGLE_MAPS_API_KEY;
  const includedTypes = placeTypeMap[layer] || [];
  if (apiKey) {
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.googleMapsUri',
        },
        body: JSON.stringify({
          includedTypes: includedTypes.length ? includedTypes : undefined,
          maxResultCount: 12,
          rankPreference: 'POPULARITY',
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lon },
              radius,
            },
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) return json({ ok: false, provider: 'google', error: data }, response.status);
      return json({
        ok: true,
        provider: 'google',
        places: (data.places || []).map(normalizeGooglePlace).filter((place) => place.name && Number.isFinite(place.latitude) && Number.isFinite(place.longitude)),
      });
    } catch (error) {
      return json({ ok: false, provider: 'google', error: error instanceof Error ? error.message : String(error) }, 502);
    }
  }

  try {
    const query = \`
      [out:json][timeout:18];
      (
        node(around:\${radius},\${lat},\${lon})[name][amenity];
        way(around:\${radius},\${lat},\${lon})[name][amenity];
        relation(around:\${radius},\${lat},\${lon})[name][amenity];
        node(around:\${radius},\${lat},\${lon})[name][shop];
        way(around:\${radius},\${lat},\${lon})[name][shop];
        relation(around:\${radius},\${lat},\${lon})[name][shop];
        node(around:\${radius},\${lat},\${lon})[name][tourism];
        way(around:\${radius},\${lat},\${lon})[name][tourism];
        relation(around:\${radius},\${lat},\${lon})[name][tourism];
        node(around:\${radius},\${lat},\${lon})[name][leisure];
        way(around:\${radius},\${lat},\${lon})[name][leisure];
        relation(around:\${radius},\${lat},\${lon})[name][leisure];
      );
      out center 18;
    \`;
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'User-Agent': 'FootprintSproutPrototype/0.1 contact=sites' },
      body: query,
    });
    const data = await response.json();
    return json({
      ok: true,
      provider: 'openstreetmap',
      places: (data.elements || [])
        .map(normalizeOsmElement)
        .filter((place) => place.name && Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
        .slice(0, 12),
    });
  } catch (error) {
    return json({ ok: false, provider: 'openstreetmap', error: error instanceof Error ? error.message : String(error) }, 502);
  }
}

async function reverseGeocode(request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ ok: false, error: 'lat and lon are required' }, 400);
  }
  try {
    const api = new URL('https://nominatim.openstreetmap.org/reverse');
    api.searchParams.set('format', 'jsonv2');
    api.searchParams.set('lat', String(lat));
    api.searchParams.set('lon', String(lon));
    api.searchParams.set('accept-language', 'zh-TW,zh,en');
    const response = await fetch(api, { headers: { 'User-Agent': 'FootprintSproutPrototype/0.1 contact=sites' } });
    const data = await response.json();
    const address = data.address || {};
    const area = address.suburb || address.city_district || address.town || address.city || address.county || address.state || data.name || '目前位置';
    return json({ ok: true, area, address, displayName: data.display_name });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/nearby-places') return nearbyPlaces(request, env);
    if (url.pathname === '/api/reverse-geocode') return reverseGeocode(request);
    if (url.pathname === '/manifest.webmanifest') {
      return new Response(MANIFEST, { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } });
    }
    if (url.pathname === '/app-icon.svg') {
      return new Response(APP_ICON, { headers: { 'content-type': 'image/svg+xml; charset=utf-8' } });
    }
    if (url.pathname === '/sw.js') {
      return new Response(SERVICE_WORKER, {
        headers: {
          'content-type': 'application/javascript; charset=utf-8',
          'cache-control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
    const key = env.VITE_GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY || 'VITE_GOOGLE_MAPS_API_KEY';
    return new Response(HTML.replaceAll('%VITE_GOOGLE_MAPS_API_KEY%', key), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
};
`;

writeFileSync(new URL('../dist/server/index.js', import.meta.url), server);
