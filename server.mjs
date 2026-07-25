import express from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function loadLocalEnv() {
  const envPath = fileURLToPath(new URL('./.env', import.meta.url));
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadLocalEnv();

const app = express();
const port = Number(process.env.PORT || 5173);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '14mb' }));

app.get('/api/reverse-geocode', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({ ok: false, error: 'lat and lon are required' });
    return;
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('accept-language', 'zh-TW,zh,en');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FootprintSproutPrototype/0.1 contact=local-dev',
      },
    });
    const data = await response.json();
    const address = data.address || {};
    const area = address.suburb
      || address.city_district
      || address.town
      || address.city
      || address.county
      || address.state
      || data.name
      || '目前位置';
    res.json({ ok: true, area, address, displayName: data.display_name });
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

const placeTypeMap = {
  all: [],
  food: ['restaurant', 'cafe', 'bakery', 'meal_takeaway'],
  scenic: ['tourist_attraction', 'park', 'museum'],
  cafe: ['cafe'],
  walk: ['park', 'tourist_attraction', 'library', 'museum'],
};

function normalizeGooglePlace(place, index) {
  const location = place.location || {};
  const displayName = place.displayName?.text || place.name || `Place ${index + 1}`;
  return {
    id: place.id || `google-${index}`,
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
    id: `osm-${element.type}-${element.id}`,
    source: 'openstreetmap',
    name: tags.name || tags['name:zh'] || tags['name:en'] || `${category} ${index + 1}`,
    address: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
    latitude,
    longitude,
    category,
    types: Object.keys(tags).filter((key) => ['amenity', 'shop', 'tourism', 'leisure'].includes(key)).map((key) => tags[key]),
    googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  };
}

app.get('/api/nearby-places', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const layer = String(req.query.layer || 'all');
  const radius = Math.min(1500, Math.max(250, Number(req.query.radius || 900)));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({ ok: false, error: 'lat and lon are required' });
    return;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
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
      if (!response.ok) {
        res.status(response.status).json({ ok: false, provider: 'google', error: data });
        return;
      }
      res.json({
        ok: true,
        provider: 'google',
        places: (data.places || []).map(normalizeGooglePlace).filter((place) => place.name && Number.isFinite(place.latitude) && Number.isFinite(place.longitude)),
      });
      return;
    } catch (error) {
      res.status(502).json({ ok: false, provider: 'google', error: error instanceof Error ? error.message : String(error) });
      return;
    }
  }

  try {
    const query = `
      [out:json][timeout:18];
      (
        node(around:${radius},${lat},${lon})[name][amenity];
        way(around:${radius},${lat},${lon})[name][amenity];
        relation(around:${radius},${lat},${lon})[name][amenity];
        node(around:${radius},${lat},${lon})[name][shop];
        way(around:${radius},${lat},${lon})[name][shop];
        relation(around:${radius},${lat},${lon})[name][shop];
        node(around:${radius},${lat},${lon})[name][tourism];
        way(around:${radius},${lat},${lon})[name][tourism];
        relation(around:${radius},${lat},${lon})[name][tourism];
        node(around:${radius},${lat},${lon})[name][leisure];
        way(around:${radius},${lat},${lon})[name][leisure];
        relation(around:${radius},${lat},${lon})[name][leisure];
      );
      out center 18;
    `;
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'User-Agent': 'FootprintSproutPrototype/0.1 contact=local-dev' },
      body: query,
    });
    const data = await response.json();
    res.json({
      ok: true,
      provider: 'openstreetmap',
      places: (data.elements || [])
        .map(normalizeOsmElement)
        .filter((place) => place.name && Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
        .slice(0, 12),
    });
  } catch (error) {
    res.status(502).json({ ok: false, provider: 'openstreetmap', error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/generate-3d-pet', async (req, res) => {
  const { imageDataUri, prompt, mode, features } = req.body || {};

  if (!imageDataUri) {
    res.status(400).json({ ok: false, error: 'imageDataUri is required' });
    return;
  }

  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    res.json({
      ok: true,
      provider: 'local-feature-model',
      status: 'fallback',
      message: 'MESHY_API_KEY is not configured; using local feature-driven 3D model.',
      features,
    });
    return;
  }

  try {
    const response = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageDataUri,
        model_type: 'smart-topology',
        ai_model: 'meshy-t2',
        should_texture: true,
        enable_pbr: true,
        should_remesh: true,
        target_polycount: 50000,
        target_formats: ['glb'],
        topology: 'triangle',
        art_style: 'cartoon',
        negative_prompt: 'flat image, 2d sticker, realistic human face, copyrighted character',
        prompt: `${prompt || 'cute companion creature'}; ${mode || 'playful'}; stylized original mobile game creature; preserve the main subject silhouette and colors`,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ ok: false, provider: 'meshy', error: data });
      return;
    }

    res.json({
      ok: true,
      provider: 'meshy',
      status: 'submitted',
      taskId: data.result,
      features,
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      provider: 'meshy',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/generate-3d-pet/:taskId', async (req, res) => {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    res.status(501).json({ ok: false, error: 'MESHY_API_KEY is not configured' });
    return;
  }

  try {
    const response = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${req.params.taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await response.json();
    res.status(response.status).json({ ok: response.ok, provider: 'meshy', task: data });
  } catch (error) {
    res.status(502).json({
      ok: false,
      provider: 'meshy',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

if (isProduction) {
  app.use(express.static('dist'));
  app.use((_req, res) => res.sendFile(fileURLToPath(new URL('./dist/index.html', import.meta.url))));
} else {
  app.use(express.static('public'));
  app.use((_req, res) => {
    const htmlPath = fileURLToPath(new URL('./index.html', import.meta.url));
    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || 'VITE_GOOGLE_MAPS_API_KEY';
    const html = readFileSync(htmlPath, 'utf8').replaceAll('%VITE_GOOGLE_MAPS_API_KEY%', mapsKey);
    res.type('html').send(html);
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Footprint Sprout running on http://0.0.0.0:${port}`);
});
