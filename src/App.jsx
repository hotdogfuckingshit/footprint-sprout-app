import {
  Award,
  Bike,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  Cuboid,
  Eye,
  Flag,
  Footprints,
  Gem,
  Heart,
  ImageUp,
  Layers,
  MapPin,
  MessageSquareText,
  Navigation,
  Orbit,
  PawPrint,
  PenLine,
  PlusCircle,
  RefreshCw,
  Route,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Trash2,
  Trophy,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const today = new Date().toISOString().slice(0, 10);
let detectorPromise = null;
let classifierPromise = null;

const locations = [
  {
    id: 'maple-garden',
    name: '秋紅谷景觀生態公園',
    type: '景色',
    coord: { x: 39, y: 39 },
    steps: 760,
    dwellGoal: 3,
    reward: 12,
    accessory: { id: 'maple-cape', name: '秋紅谷楓葉披風', slot: '身體', color: '#d34f33' },
    palette: ['#d34f33', '#f3a646', '#1d6b65'],
    description: '夕陽、草坡和水面很適合讓記憶靈採集自然光粒。',
    tags: ['夕陽', '散步', '景觀'],
    notes: [
      { user: '阿翰', text: '黃昏來最舒服，環池一圈剛好能累積探索步數。', helpful: 18 },
      { user: 'Mina', text: '雨後會有水氣，寵物合照很容易拍到倒影。', helpful: 11 },
    ],
  },
  {
    id: 'opera-house',
    name: '臺中國家歌劇院',
    type: '景色',
    coord: { x: 50, y: 34 },
    steps: 1180,
    dwellGoal: 4,
    reward: 14,
    accessory: { id: 'curve-crown', name: '曲面建築皇冠', slot: '頭部', color: '#8b6cff' },
    palette: ['#8b6cff', '#e8ddc5', '#243b53'],
    description: '曲牆與廣場會掉落建築系記憶物，適合大型 3D 合照。',
    tags: ['建築', '廣場', '夜景'],
    notes: [{ user: '石虎泡芙', text: '晚上外牆燈亮後，寵物輪廓會更明顯。', helpful: 22 }],
  },
  {
    id: 'fengchia',
    name: '逢甲夜市',
    type: '美食',
    coord: { x: 28, y: 54 },
    steps: 980,
    dwellGoal: 5,
    reward: 16,
    accessory: { id: 'lantern-hood', name: '逢甲燈籠帽', slot: '頭部', color: '#ffbf3f' },
    palette: ['#ffbf3f', '#ef476f', '#17324d'],
    description: '招牌、小吃與人流會產生熱鬧系素材，隊伍採集效率最高。',
    tags: ['夜市', '小吃', '人潮'],
    notes: [{ user: 'Leo', text: '建議從側巷切入，主街太擠時仍能完成停留認證。', helpful: 15 }],
  },
  {
    id: 'blue-cafe',
    name: '藍瓷咖啡',
    type: '咖啡廳',
    coord: { x: 62, y: 49 },
    steps: 620,
    dwellGoal: 3,
    reward: 11,
    accessory: { id: 'blue-cup-hat', name: '藍瓷咖啡杯帽', slot: '頭部', color: '#277da1' },
    palette: ['#277da1', '#f7f3e3', '#724c2e'],
    description: '藍白店面與窗邊座位會讓寵物取得咖啡香氣類記憶。',
    tags: ['咖啡', '窗邊', '甜點'],
    notes: [{ user: 'Nora', text: '下午三點後窗光最好，適合把寵物放在杯子旁。', helpful: 9 }],
  },
  {
    id: 'gear-cafe',
    name: '齒輪咖啡工坊',
    type: '咖啡廳',
    coord: { x: 71, y: 61 },
    steps: 1320,
    dwellGoal: 3,
    reward: 13,
    accessory: { id: 'gear-pack', name: '齒輪咖啡機背包', slot: '背部', color: '#6f5e53' },
    palette: ['#6f5e53', '#d1b48c', '#46a59e'],
    description: '工業風與金屬吧台會讓隊伍採集到機械系素材。',
    tags: ['咖啡', '工業風', '手沖'],
    notes: [{ user: '健走王', text: '從市政公園走過來步數剛好，路線很平。', helpful: 7 }],
  },
  {
    id: 'ramen-lane',
    name: '赤湯拉麵巷',
    type: '美食',
    coord: { x: 45, y: 67 },
    steps: 880,
    dwellGoal: 4,
    reward: 12,
    accessory: { id: 'chashu-band', name: '叉燒頭巾', slot: '臉部', color: '#b43b2f' },
    palette: ['#b43b2f', '#f1d3a4', '#1d1d1f'],
    description: '紅色燈牌與熱湯霧氣會生成濃厚的美食系記憶。',
    tags: ['拉麵', '巷弄', '排隊'],
    notes: [{ user: '肉球旅人', text: '排隊時可完成停留，但不要擋到店門。', helpful: 13 }],
  },
  {
    id: 'book-corner',
    name: '頁角書店',
    type: '秘境',
    coord: { x: 59, y: 74 },
    steps: 1560,
    dwellGoal: 3,
    reward: 15,
    accessory: { id: 'floating-book', name: '漂浮翻頁書', slot: '周圍', color: '#3d405b' },
    palette: ['#3d405b', '#f2cc8f', '#81b29a'],
    description: '安靜到訪筆記比星級評論更能留下真實探索感。',
    tags: ['書店', '安靜', '雨天'],
    notes: [{ user: '山茶', text: '雨天來很適合，寵物看書姿勢會很搭。', helpful: 10 }],
  },
  {
    id: 'metro-gate',
    name: '市政府站口袋廣場',
    type: '散步路線',
    coord: { x: 66, y: 28 },
    steps: 1420,
    dwellGoal: 2,
    reward: 10,
    accessory: { id: 'ticket-badge', name: '綠線車票徽章', slot: '周圍', color: '#2a9d8f' },
    palette: ['#2a9d8f', '#f4a261', '#264653'],
    description: '交通節點可作為路線起點，但不公開住家附近完整軌跡。',
    tags: ['捷運', '起點', '無障礙'],
    notes: [{ user: 'Route99', text: '電梯動線清楚，適合規劃無障礙散步路線。', helpful: 8 }],
  },
];

const routes = [
  { id: 'sunset-food', name: '秋紅谷到逢甲晚風線', placeIds: ['maple-garden', 'blue-cafe', 'fengchia'], reward: 20 },
  { id: 'quiet-city', name: '雨天室內記憶線', placeIds: ['opera-house', 'book-corner', 'gear-cafe'], reward: 18 },
  { id: 'station-loop', name: '市政無障礙散步線', placeIds: ['metro-gate', 'opera-house', 'maple-garden'], reward: 16 },
];

const journeyTimes = ['40 分鐘', '1 小時', '2 小時', '1 天'];
const journeyThemes = [
  { id: 'old', label: '老街痕跡', mark: '舊' },
  { id: 'color', label: '城市色彩', mark: '色' },
  { id: 'nature', label: '自然縫隙', mark: '葉' },
  { id: 'build', label: '建築細節', mark: '築' },
];
const mapLayers = [
  { id: 'all', label: '全部' },
  { id: 'food', label: '美食' },
  { id: 'scenic', label: '景點' },
  { id: 'cafe', label: '咖啡廳' },
  { id: 'walk', label: '散步' },
];
const marketPacks = [
  { id: 'starter', name: '散步補給包', fragments: 80, price: 'NT$30', bonus: '只能生成，不能買到到訪徽章' },
  { id: 'creator', name: '創生碎片包', fragments: 180, price: 'NT$70', bonus: '適合多試幾張照片主角' },
  { id: 'wander', name: '週末遠行包', fragments: 360, price: 'NT$120', bonus: '不影響地點筆記排序' },
];
const dailyMissions = [
  { id: 'steps', label: '累積 1000 步', reward: 12 },
  { id: 'note', label: '完成一則到訪筆記', reward: 8 },
  { id: 'photo', label: '和寵物合照一次', reward: 6 },
];

const defaultMapCenter = { latitude: 24.1652, longitude: 120.6382 };
const mapZoom = 17;
const mapTileSize = 256;

function latLonToTilePoint(latitude, longitude, zoom = mapZoom) {
  const scale = 2 ** zoom;
  const latRad = latitude * Math.PI / 180;
  return {
    x: ((longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  };
}

function buildMapTiles(center = defaultMapCenter) {
  const cols = 5;
  const rows = 6;
  const point = latLonToTilePoint(center.latitude, center.longitude);
  const centerPixelX = point.x * mapTileSize;
  const centerPixelY = point.y * mapTileSize;
  const startPixelX = centerPixelX - (cols * mapTileSize) / 2;
  const startPixelY = centerPixelY - (rows * mapTileSize) / 2;
  const startTileX = Math.floor(startPixelX / mapTileSize);
  const startTileY = Math.floor(startPixelY / mapTileSize);
  const offsetX = startTileX * mapTileSize - startPixelX;
  const offsetY = startTileY * mapTileSize - startPixelY;
  const maxTile = 2 ** mapZoom;

  return Array.from({ length: cols * rows }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = ((startTileX + col) % maxTile + maxTile) % maxTile;
    const y = Math.max(0, Math.min(maxTile - 1, startTileY + row));
    return {
      x,
      y,
      left: Math.round(offsetX + col * mapTileSize),
      top: Math.round(offsetY + row * mapTileSize),
      url: `https://tile.openstreetmap.org/${mapZoom}/${x}/${y}.png`,
    };
  });
}

function googleMapSrc(center = defaultMapCenter) {
  return `https://maps.google.com/maps?q=${center.latitude},${center.longitude}&z=${mapZoom}&output=embed`;
}

function distanceMeters(from, to) {
  const earthRadius = 6371000;
  const dLat = (to.latitude - from.latitude) * Math.PI / 180;
  const dLon = (to.longitude - from.longitude) * Math.PI / 180;
  const lat1 = from.latitude * Math.PI / 180;
  const lat2 = to.latitude * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function coordFromLatLon(place, center = defaultMapCenter) {
  const latScale = 111320;
  const lonScale = Math.cos(center.latitude * Math.PI / 180) * 111320;
  const east = (place.longitude - center.longitude) * lonScale;
  const north = (place.latitude - center.latitude) * latScale;
  const radius = 620;
  return {
    x: Math.max(7, Math.min(93, Math.round((50 + (east / radius) * 50) * 10) / 10)),
    y: Math.max(9, Math.min(91, Math.round((50 - (north / radius) * 50) * 10) / 10)),
  };
}

function categoryLabel(category = '') {
  const normalized = category.replaceAll('_', ' ');
  const labels = {
    restaurant: '餐廳',
    cafe: '咖啡廳',
    bakery: '烘焙',
    meal_takeaway: '外帶',
    tourist_attraction: '景點',
    park: '公園',
    museum: '博物館',
    library: '圖書館',
    convenience_store: '便利商店',
    supermarket: '超市',
  };
  return labels[category] || normalized || '地點';
}

function paletteForPlace(place, index) {
  const colors = ['#f27d38', '#2f8f72', '#4e74a8', '#c84d65', '#8d6a36', '#7c63b4'];
  const base = colors[index % colors.length];
  return [base, '#fff5d6', '#203c35'];
}

function makeRealLocation(place, index, center = defaultMapCenter) {
  const steps = Math.max(120, Math.round(distanceMeters(center, place) * 1.35));
  const label = categoryLabel(place.category);
  const palette = paletteForPlace(place, index);
  return {
    id: place.id,
    real: true,
    source: place.source,
    name: place.name,
    type: label,
    coord: coordFromLatLon(place, center),
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address || 'Google Maps / OpenStreetMap 上的真實地點',
    googleMapsUri: place.googleMapsUri,
    steps,
    dwellGoal: 2,
    reward: 10 + (index % 5),
    accessory: { id: `real-${place.id}`, name: `${label}記憶徽章`, slot: '地點', color: palette[0] },
    palette,
    description: place.address || `${label}，距離約 ${steps} 步。`,
    tags: [label, place.category, place.source].filter(Boolean),
    notes: [],
  };
}

function makeLoadingLocation(status) {
  return {
    id: 'loading-real-places',
    real: false,
    source: 'loading',
    name: '正在載入附近真實地點',
    type: '地圖資料',
    coord: { x: 50, y: 50 },
    address: status,
    googleMapsUri: null,
    steps: 0,
    dwellGoal: 1,
    reward: 0,
    accessory: { id: 'loading-place', name: '真實地點載入中', slot: '地點', color: '#78928a' },
    palette: ['#78928a', '#f7f3df', '#203c35'],
    description: status,
    tags: [],
    notes: [],
  };
}

function makeLocalLocations(areaName) {
  const area = areaName || '目前位置';
  const names = {
    'maple-garden': `${area} 光影公園`,
    'opera-house': `${area} 展演廣場`,
    fengchia: `${area} 夜食巷口`,
    'blue-cafe': `${area} 轉角咖啡`,
    'gear-cafe': `${area} 手作工坊`,
    'ramen-lane': `${area} 熱湯小巷`,
    'book-corner': `${area} 安靜書角`,
    'metro-gate': `${area} 交通口袋廣場`,
  };
  return locations.map((loc) => ({
    ...loc,
    district: area,
    name: names[loc.id] || loc.name,
    description: loc.description.replace('西屯', area),
  }));
}

const defaultRealPlaces = [
  { id: 'seed-chaofu-temple', source: 'google-map-seed', name: '台中朝富宮', address: '台中市西屯區朝富路一帶', latitude: 24.1647, longitude: 120.6371, category: 'tourist_attraction', types: ['tourist_attraction'], googleMapsUri: 'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E4%B8%AD%E6%9C%9D%E5%AF%8C%E5%AE%AE' },
  { id: 'seed-hanzhan', source: 'google-map-seed', name: '韓棧食堂', address: '台中市西屯區育仁街周邊', latitude: 24.1664, longitude: 120.6380, category: 'restaurant', types: ['restaurant'], googleMapsUri: 'https://www.google.com/maps/search/?api=1&query=%E9%9F%93%E6%A3%A7%E9%A3%9F%E5%A0%82%20%E5%8F%B0%E4%B8%AD' },
  { id: 'seed-vietnamese-food', source: 'google-map-seed', name: '越南小吃', address: '台中市西屯區育英路周邊', latitude: 24.1642, longitude: 120.6374, category: 'restaurant', types: ['restaurant'], googleMapsUri: 'https://www.google.com/maps/search/?api=1&query=%E8%B6%8A%E5%8D%97%E5%B0%8F%E5%90%83%20%E8%A5%BF%E5%B1%AF%20%E8%82%B2%E8%8B%B1%E8%B7%AF' },
  { id: 'seed-food-sky', source: 'google-map-seed', name: '食為天', address: '台中市西屯區朝富路周邊', latitude: 24.1633, longitude: 120.6361, category: 'restaurant', types: ['restaurant'], googleMapsUri: 'https://www.google.com/maps/search/?api=1&query=%E9%A3%9F%E7%82%BA%E5%A4%A9%20%E5%8F%B0%E4%B8%AD%20%E8%A5%BF%E5%B1%AF' },
  { id: 'seed-one-pot-chaofu', source: 'google-map-seed', name: '這一鍋 台中朝富殿', address: '台中市西屯區朝富路周邊', latitude: 24.1668, longitude: 120.6368, category: 'restaurant', types: ['restaurant'], googleMapsUri: 'https://www.google.com/maps/search/?api=1&query=%E9%80%99%E4%B8%80%E9%8D%8B%20%E5%8F%B0%E4%B8%AD%E6%9C%9D%E5%AF%8C%E6%AE%BF' },
  { id: 'seed-chaofu-cafe', source: 'google-map-seed', name: 'Louisa Coffee 路易莎 台中朝富門市', address: '台中市西屯區朝富路周邊', latitude: 24.1657, longitude: 120.6365, category: 'cafe', types: ['cafe'], googleMapsUri: 'https://www.google.com/maps/search/?api=1&query=Louisa%20Coffee%20%E5%8F%B0%E4%B8%AD%E6%9C%9D%E5%AF%8C%E9%96%80%E5%B8%82' },
  { id: 'seed-hongsen-motor', source: 'google-map-seed', name: '弘森車業', address: '台中市西屯區育仁街周邊', latitude: 24.1649, longitude: 120.6360, category: 'store', types: ['store'], googleMapsUri: 'https://www.google.com/maps/search/?api=1&query=%E5%BC%98%E6%A3%AE%E8%BB%8A%E6%A5%AD%20%E5%8F%B0%E4%B8%AD' },
  { id: 'seed-tea-wholesale', source: 'google-map-seed', name: '大大批發 茶包多種茶品任你選', address: '台中市西屯區朝富路周邊', latitude: 24.1629, longitude: 120.6357, category: 'store', types: ['store'], googleMapsUri: 'https://www.google.com/maps/search/?api=1&query=%E5%A4%A7%E5%A4%A7%E6%89%B9%E7%99%BC%20%E8%8C%B6%E5%8C%85%20%E5%8F%B0%E4%B8%AD' },
];

function placeMatchesLayer(place, layer) {
  if (!place || layer === 'all') return true;
  const tokens = new Set([
    place.category,
    ...(Array.isArray(place.types) ? place.types : []),
    ...(Array.isArray(place.tags) ? place.tags : []),
  ].filter(Boolean).map((item) => String(item).toLowerCase()));

  if (layer === 'food') {
    return ['restaurant', 'food', 'meal_takeaway', 'bakery', 'bar', 'cafe'].some((token) => tokens.has(token));
  }
  if (layer === 'cafe') {
    return tokens.has('cafe') || /coffee|咖啡|路易莎/i.test(place.name || '');
  }
  if (layer === 'scenic') {
    return ['tourist_attraction', 'park', 'museum', 'place_of_worship', 'temple', 'scenic', 'viewpoint'].some((token) => tokens.has(token))
      || /宮|廟|公園|景|廣場/i.test(place.name || '');
  }
  if (layer === 'walk') {
    return ['park', 'tourist_attraction', 'museum', 'library', 'store', 'restaurant', 'cafe', 'place_of_worship'].some((token) => tokens.has(token));
  }
  return true;
}

const initialPet = {
  id: 'mochi',
  name: '豆芽麻糬',
  species: '城市記憶靈',
  color: '#59b36a',
  accent: '#ffcf5a',
  aura: '#5fb3ff',
  form: 'round',
  features: {
    palette: ['#59b36a', '#ffcf5a', '#5fb3ff'],
    profile: 'plant',
    aspect: 0.72,
    subjectRatio: 0.45,
    edgeDensity: 0.28,
    topMass: 0.62,
    bottomMass: 0.38,
    leftMass: 0.5,
    rightMass: 0.5,
    appendages: ['leaf-crown', 'legs', 'tail'],
    confidence: 0.72,
  },
  level: 2,
  steps: 1840,
  affection: 36,
  bornFrom: '第一張真實城市散步照片',
  equipped: {},
  traits: ['伴走', '採集', '好奇'],
  memoryLog: [
    { type: 'born', title: '從城市散步照片誕生', detail: '第一隻核心寵物，會記住到訪、合照與路線。', date: today },
  ],
};

const initialState = {
  position: { x: 18, y: 38 },
  fragments: 168,
  totalSteps: 1840,
  speedMode: 'walk',
  targetId: null,
  routeProgress: 0,
  dwell: {},
  visits: {},
  unlockedAccessories: [],
  pets: [initialPet],
  activePetId: 'mochi',
  squadIds: ['mochi'],
  memoryCards: [],
  playerNotes: {},
  completedRoutes: [],
  activeRouteId: null,
  customRoutes: [],
  journey: {
    time: '40 分鐘',
    theme: 'color',
    mode: '自己走走',
    condition: '一般步行',
  },
  mapLayer: 'all',
  dailyClaimed: [],
  marketPurchases: [],
  moderationQueue: [],
  blockedUsers: [],
  safetySettings: {
    privateAccount: false,
    hideHomeZone: true,
    delayVisitPosts: true,
    stripPhotoGps: true,
    allowStrangerMessages: false,
  },
};

function readState() {
  try {
    const saved = localStorage.getItem('footprint-sprout-v4-state');
    const parsed = saved ? { ...initialState, ...JSON.parse(saved) } : initialState;
    if (!mapLayers.some((layer) => layer.id === parsed.mapLayer)) parsed.mapLayer = 'all';
    return parsed;
  } catch {
    return initialState;
  }
}

function hashText(input) {
  return [...input].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 360, 17);
}

function hsl(h, s, l) {
  return `hsl(${h} ${s}% ${l}%)`;
}

function dateLabel(value = today) {
  return value.replaceAll('-', '.');
}

async function detectObjects(image) {
  try {
    if (!detectorPromise) {
      detectorPromise = Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/coco-ssd'),
      ]).then(async ([tf, cocoSsd]) => {
        await tf.setBackend('cpu');
        await tf.ready();
        return cocoSsd.load({ base: 'lite_mobilenet_v2' });
      });
    }
    const detector = await Promise.race([
      detectorPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('detector timeout')), 8000)),
    ]);
    return detector.detect(image);
  } catch (error) {
    console.warn('object detection failed', error);
    return [];
  }
}

async function classifyImage(image) {
  try {
    if (!classifierPromise) {
      classifierPromise = Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/mobilenet'),
      ]).then(async ([tf, mobilenet]) => {
        await tf.setBackend('cpu');
        await tf.ready();
        return mobilenet.load({ version: 2, alpha: 0.5 });
      });
    }
    const classifier = await Promise.race([
      classifierPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('classifier timeout')), 8000)),
    ]);
    const variants = [image];
    const cropSpecs = [
      [0.04, 0.12, 0.92, 0.28],
      [0.06, 0.18, 0.88, 0.22],
      [0.05, 0.0, 0.9, 0.45],
      [0.18, 0.12, 0.64, 0.32],
      [0.0, 0.0, 1, 0.55],
    ];
    cropSpecs.forEach(([sx, sy, sw, sh]) => {
      const canvas = document.createElement('canvas');
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        image.width * sx,
        image.height * sy,
        image.width * sw,
        image.height * sh,
        0,
        0,
        224,
        224
      );
      variants.push(canvas);
    });
    const results = [];
    for (const variant of variants) {
      const classified = await classifier.classify(variant, 5);
      results.push(...classified);
    }
    return results.sort((a, b) => b.probability - a.probability).slice(0, 8);
  } catch (error) {
    console.warn('image classification failed', error);
    return [];
  }
}

const defaultFeatures = {
  palette: ['#59b36a', '#ffcf5a', '#5fb3ff'],
  aspect: 1,
  subjectRatio: 0.45,
  edgeDensity: 0.25,
  topMass: 0.5,
  bottomMass: 0.5,
  leftMass: 0.5,
  rightMass: 0.5,
  profile: 'round',
  appendages: ['side-fins'],
  voxels: null,
  detectedClass: null,
  detectedScore: 0,
  detectedBox: null,
  confidence: 0,
};

function semanticFromText(text) {
  if (/dog|puppy|chihuahua|terrier|retriever|poodle|husky|corgi|beagle|spaniel|pug|maltese|samoyed|shepherd|collie|pinscher|schnauzer|狗|小狗|犬/.test(text)) {
    return { detectedClass: 'dog', profile: 'dog', appendages: ['dog-ears', 'snout', 'tail', 'legs'] };
  }
  if (/cat|kitten|tabby|persian|siamese|egyptian cat|tiger cat|貓/.test(text)) {
    return { detectedClass: 'cat', profile: 'cat', appendages: ['cat-ears', 'snout', 'tail', 'legs'] };
  }
  if (/goose|gosling|鵝/.test(text)) {
    return { detectedClass: 'goose', profile: 'goose', appendages: ['beak', 'wings', 'webbed-feet', 'long-neck'] };
  }
  if (/duck|drake|mallard|鴨/.test(text)) {
    return { detectedClass: 'duck', profile: 'duck', appendages: ['beak', 'wings', 'webbed-feet', 'tail'] };
  }
  if (/chicken|hen|rooster|cock|chick|雞|小雞/.test(text)) {
    return { detectedClass: 'chicken', profile: 'chicken', appendages: ['beak', 'wings', 'legs', 'comb'] };
  }
  if (/person|human|man|woman|boy|girl|face|人|人物|人形/.test(text)) {
    return { detectedClass: 'person', profile: 'person', appendages: ['head', 'arms', 'legs'] };
  }
  return null;
}

function classifyPrompt(prompt) {
  const text = prompt.toLowerCase();
  const semantic = semanticFromText(text);
  if (semantic) return { profile: semantic.profile, appendages: semantic.appendages };
  if (/寵物|動物|鳥/.test(text)) return { profile: 'animal', appendages: ['ears', 'tail', 'legs'] };
  if (/car|bus|bike|車|公車|機車|腳踏車/.test(text)) return { profile: 'vehicle', appendages: ['wheels', 'tail'] };
  if (/coffee|cup|drink|咖啡|杯|飲料/.test(text)) return { profile: 'cup', appendages: ['handle', 'steam'] };
  if (/plant|flower|tree|植物|花|樹|葉/.test(text)) return { profile: 'plant', appendages: ['leaf-crown', 'roots'] };
  if (/food|ramen|rice|cake|食物|拉麵|飯|甜點/.test(text)) return { profile: 'food', appendages: ['steam', 'side-fins'] };
  if (/building|house|tower|建築|房|樓|塔/.test(text)) return { profile: 'building', appendages: ['horns', 'side-fins'] };
  return null;
}

function makePetFromPrompt(prompt, mode, analysis = null) {
  const hue = hashText(`${prompt}-${mode}-${Date.now()}`);
  const features = analysis || {
    ...defaultFeatures,
    palette: [hsl(hue, 58, 56), hsl((hue + 78) % 360, 78, 64), hsl((hue + 176) % 360, 70, 62)],
  };
  const semantic = classifyPrompt(prompt);
  const finalFeatures = semantic
    ? { ...features, profile: semantic.profile, appendages: [...new Set([...(features.appendages || []), ...semantic.appendages])] }
    : features;
  const palette = finalFeatures.palette || defaultFeatures.palette;
  const luminance = (color) => {
    const hex = color.startsWith('#') ? color.slice(1) : '808080';
    const value = hex.length === 6 ? hex : '808080';
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return r * 0.299 + g * 0.587 + b * 0.114;
  };
  const colors = finalFeatures.profile === 'dog'
    ? [...palette].sort((a, b) => luminance(b) - luminance(a))
    : palette;
  return {
    id: `pet-${Date.now()}`,
    name: prompt.trim().slice(0, 8) || '新生記憶靈',
    species: mode,
    color: colors[0],
    accent: colors[1] || colors[0],
    aura: colors[2] || colors[1] || colors[0],
    form: finalFeatures.profile,
    features: finalFeatures,
    level: 1,
    steps: 0,
    affection: 12,
    bornFrom: prompt.trim() || '上傳圖片',
    equipped: {},
    traits: [mode, '主角輪廓', `${Math.round(finalFeatures.confidence * 100)}% 特徵可信度`],
  };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

async function analyzeImageFeatures(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const [detections, classifications] = image.width < 32 || image.height < 32
      ? [[], []]
      : await Promise.all([
        detectObjects(image),
        classifyImage(image),
      ]);
    const sceneObjectClasses = new Set(['dining table', 'bowl', 'cup', 'wine glass', 'fork', 'knife', 'spoon', 'plate', 'chair', 'bench']);
    const usefulDetections = detections.filter((item) => item.score > 0.42 && !sceneObjectClasses.has(item.class));
    const fallbackDetection = detections
      .filter((item) => item.score > 0.62)
      .sort((a, b) => (b.bbox[2] * b.bbox[3] * b.score) - (a.bbox[2] * a.bbox[3] * a.score))[0] || null;
    const mainDetection = usefulDetections
      .sort((a, b) => (b.bbox[2] * b.bbox[3] * b.score) - (a.bbox[2] * a.bbox[3] * a.score))[0] || null;
    const classText = [
      classifications.map((item) => item.className).join(', '),
      usefulDetections.map((item) => item.class).join(', '),
    ].join(', ').toLowerCase();
    const semanticByText = semanticFromText(classText);

    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const cornerSamples = [
      [0, 0],
      [size - 1, 0],
      [0, size - 1],
      [size - 1, size - 1],
      [Math.floor(size / 2), 0],
      [Math.floor(size / 2), size - 1],
    ].map(([x, y]) => {
      const index = (y * size + x) * 4;
      return [data[index], data[index + 1], data[index + 2]];
    });
    const bg = cornerSamples.reduce((acc, rgb) => acc.map((value, index) => value + rgb[index]), [0, 0, 0]).map((value) => value / cornerSamples.length);
    const subject = [];
    const buckets = new Map();
    let minX = mainDetection ? Math.max(0, Math.floor((mainDetection.bbox[0] / image.width) * size)) : size;
    let minY = mainDetection ? Math.max(0, Math.floor((mainDetection.bbox[1] / image.height) * size)) : size;
    let maxX = mainDetection ? Math.min(size - 1, Math.ceil(((mainDetection.bbox[0] + mainDetection.bbox[2]) / image.width) * size)) : 0;
    let maxY = mainDetection ? Math.min(size - 1, Math.ceil(((mainDetection.bbox[1] + mainDetection.bbox[3]) / image.height) * size)) : 0;
    let top = 0;
    let bottom = 0;
    let left = 0;
    let right = 0;
    let edgeHits = 0;

    for (let y = 1; y < size - 1; y += 1) {
      for (let x = 1; x < size - 1; x += 1) {
        const index = (y * size + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];
        if (a < 120) continue;
        const inDetectedBox = mainDetection
          ? x >= minX && x <= maxX && y >= minY && y <= maxY
          : false;
        const bgDistance = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
        const centerDistance = Math.hypot(x - size / 2, y - size / 2);
        const foreground = inDetectedBox ? bgDistance > 18 : (bgDistance > 34 || centerDistance < size * 0.28);
        if (!foreground) continue;
        subject.push([x, y, r, g, b]);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        if (y < size / 2) top += 1;
        else bottom += 1;
        if (x < size / 2) left += 1;
        else right += 1;
        const rightIndex = (y * size + x + 1) * 4;
        const downIndex = ((y + 1) * size + x) * 4;
        const gradient = Math.hypot(r - data[rightIndex], g - data[rightIndex + 1], b - data[rightIndex + 2])
          + Math.hypot(r - data[downIndex], g - data[downIndex + 1], b - data[downIndex + 2]);
        if (gradient > 86) edgeHits += 1;
      }
    }

    const source = subject.length ? subject : [];
    for (let i = 0; i < source.length; i += 3) {
      const [, , r, g, b] = source[i];
      const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    if (!source.length) {
      for (let index = 0; index < data.length; index += 16) {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      if (a < 120) continue;
      const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
      }
    }
    const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const palette = sorted.length
      ? sorted.map(([key]) => {
        const [r, g, b] = key.split(',').map(Number);
        return rgbToHex(Math.min(255, r), Math.min(255, g), Math.min(255, b));
      })
      : defaultFeatures.palette;
    const boxWidth = Math.max(1, maxX - minX + 1);
    const boxHeight = Math.max(1, maxY - minY + 1);
    const aspect = source.length ? boxWidth / boxHeight : image.width / image.height;
    const subjectRatio = source.length / (size * size);
    const edgeDensity = source.length ? edgeHits / source.length : 0.18;
    const yellowPixels = source.filter(([, , r, g, b]) => r > 150 && g > 115 && b < 135).length;
    const palePixels = source.filter(([, , r, g, b]) => r > 185 && g > 178 && b > 145 && Math.max(r, g, b) - Math.min(r, g, b) < 80).length;
    const beakPixels = source.filter(([, , r, g, b]) => r > 160 && g > 60 && g < 180 && b > 35 && b < 170 && r > g + 18).length;
    const yellowRatio = yellowPixels / Math.max(1, source.length);
    const paleRatio = palePixels / Math.max(1, source.length);
    const beakRatio = beakPixels / Math.max(1, source.length);
    const birdLikeByColor = beakRatio > 0.025 && (yellowRatio > 0.18 || paleRatio > 0.3);
    const semanticByColor = birdLikeByColor
      ? (paleRatio > 0.45 && aspect < 0.9
        ? { detectedClass: 'goose', profile: 'goose', appendages: ['beak', 'wings', 'webbed-feet', 'long-neck'] }
        : yellowRatio > 0.28
          ? { detectedClass: 'duck', profile: 'duck', appendages: ['beak', 'wings', 'webbed-feet', 'tail'] }
          : { detectedClass: 'chicken', profile: 'chicken', appendages: ['beak', 'wings', 'legs', 'comb'] })
      : null;
    const appendages = [];
    if (Math.abs(left - right) / Math.max(1, left + right) > 0.18) appendages.push('tail');
    if (edgeDensity > 0.34) appendages.push('spikes');
    if (top > bottom * 1.15) appendages.push('horns');
    if (bottom > top * 1.35) appendages.push('legs');
    if (aspect > 1.45) appendages.push('tail');
    if (aspect < 0.72) appendages.push('leaf-crown');
    const semantic = semanticByText || semanticByColor;
    const averageColor = (predicate, fallback) => {
      const pixels = source.filter((pixel) => predicate(pixel));
      if (!pixels.length) return fallback;
      const sum = pixels.reduce((acc, [, , r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b], [0, 0, 0]);
      return rgbToHex(
        Math.round(sum[0] / pixels.length),
        Math.round(sum[1] / pixels.length),
        Math.round(sum[2] / pixels.length)
      );
    };
    const guardedColor = (color, fallback, validator) => {
      const hex = color.startsWith('#') ? color.slice(1) : '';
      if (hex.length !== 6) return fallback;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return validator(r, g, b) ? color : fallback;
    };
    const featherColor = semantic?.profile === 'goose'
      ? guardedColor(
        averageColor(([, , r, g, b]) => r > 190 && g > 185 && b > 145 && Math.max(r, g, b) - Math.min(r, g, b) < 75, '#f4f0d8'),
        '#f4f0d8',
        (r, g, b) => r > 185 && g > 178 && b > 138
      )
      : guardedColor(
        averageColor(([, , r, g, b]) => r > 175 && g > 145 && b < 135 && r >= g - 20 && r - g < 95, '#f3d760'),
        '#f3d760',
        (r, g, b) => r > 224 && g > 188 && b < 140
      );
    const beakColor = guardedColor(
      averageColor(([, , r, g, b]) => r > 165 && g > 55 && g < 180 && b > 55 && b < 185 && r > g + 18, '#ef8a68'),
      '#ef8a68',
      (r, g, b) => r > 190 && g > 75 && g < 170 && b > 70 && b < 185 && r - g > 45
    );
    const whiteFurRatio = source.filter(([, , r, g, b]) => r > 168 && g > 168 && b > 168 && Math.max(r, g, b) - Math.min(r, g, b) < 64).length / Math.max(1, source.length);
    const dogFurColor = guardedColor(
      averageColor(([, , r, g, b]) => r > 165 && g > 165 && b > 165 && Math.max(r, g, b) - Math.min(r, g, b) < 72, '#f2f1e9'),
      '#f2f1e9',
      (r, g, b) => r > 160 && g > 160 && b > 160 && Math.max(r, g, b) - Math.min(r, g, b) < 82
    );
    const dogEarColor = averageColor(([, , r, g, b]) => r > 145 && g > 105 && b > 100 && r > g + 12 && r > b + 10, '#d8b7ad');
    const dogDarkColor = averageColor(([, , r, g, b]) => r < 82 && g < 82 && b < 82, '#171717');
    const dogPalette = semantic?.profile === 'dog'
      ? [
        whiteFurRatio > 0.22 ? '#f7f7f0' : dogFurColor,
        dogEarColor,
        dogDarkColor,
      ]
      : null;
    const semanticPalette = semantic && ['chicken', 'duck', 'goose'].includes(semantic.profile)
      ? [
        featherColor,
        beakColor,
        averageColor(([, , r, g, b]) => r < 95 && g < 95 && b < 95, palette[2] || '#44372f'),
      ]
      : null;
    const detectedClass = semantic?.detectedClass || mainDetection?.class || (fallbackDetection && !sceneObjectClasses.has(fallbackDetection.class) ? fallbackDetection.class : null);
    const detectedProfile = semantic?.profile || (detectedClass === 'car' || detectedClass === 'bus' || detectedClass === 'truck'
      ? 'vehicle'
      : detectedClass === 'bird'
        ? 'chicken'
        : null);
    const profile = detectedProfile || (aspect > 1.55
      ? 'wide'
      : aspect < 0.68
        ? 'tall'
        : edgeDensity > 0.38
          ? 'spiky'
          : subjectRatio > 0.62
            ? 'chunky'
            : 'organic');
    const gridSize = 18;
    const cells = Array.from({ length: gridSize * gridSize }, () => ({ count: 0, r: 0, g: 0, b: 0 }));
    subject.forEach(([x, y, r, g, b]) => {
      const cx = Math.min(gridSize - 1, Math.max(0, Math.floor(((x - minX) / boxWidth) * gridSize)));
      const cy = Math.min(gridSize - 1, Math.max(0, Math.floor(((y - minY) / boxHeight) * gridSize)));
      const cell = cells[cy * gridSize + cx];
      cell.count += 1;
      cell.r += r;
      cell.g += g;
      cell.b += b;
    });
    const maxCell = Math.max(1, ...cells.map((cell) => cell.count));
    const voxels = cells.flatMap((cell, index) => {
      if (cell.count < Math.max(1, maxCell * 0.15)) return [];
      const x = index % gridSize;
      const y = Math.floor(index / gridSize);
      return [{
        x,
        y,
        weight: Number((cell.count / maxCell).toFixed(2)),
        color: rgbToHex(
          Math.round(cell.r / cell.count),
          Math.round(cell.g / cell.count),
          Math.round(cell.b / cell.count)
        ),
      }];
    });
    return {
      palette: semanticPalette || dogPalette || palette,
      aspect: Number(aspect.toFixed(2)),
      subjectRatio: Number(subjectRatio.toFixed(2)),
      edgeDensity: Number(edgeDensity.toFixed(2)),
      topMass: Number((top / Math.max(1, top + bottom)).toFixed(2)),
      bottomMass: Number((bottom / Math.max(1, top + bottom)).toFixed(2)),
      leftMass: Number((left / Math.max(1, left + right)).toFixed(2)),
      rightMass: Number((right / Math.max(1, left + right)).toFixed(2)),
      profile,
      appendages: semantic?.appendages || (appendages.length ? appendages : []),
      voxels,
      gridSize,
      detectedClass,
      detectedScore: Number(((semantic ? classifications[0]?.probability : mainDetection?.score) || 0).toFixed(2)),
      detectedBox: mainDetection?.bbox || null,
      classifications: classifications.map((item) => ({
        className: item.className,
        probability: Number(item.probability.toFixed(2)),
      })),
      confidence: mainDetection
        ? Number(mainDetection.score.toFixed(2))
        : Math.min(0.98, Math.max(0.2, subjectRatio * 1.4 + edgeDensity)),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function App() {
  const [state, setState] = useState(readState);
  const [activeTab, setActiveTab] = useState('map');
  const [selectedId, setSelectedId] = useState('maple-garden');
  const [noteText, setNoteText] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [petPrompt, setPetPrompt] = useState('');
  const [petMode, setPetMode] = useState('奇想融合');
  const [uploadName, setUploadName] = useState('');
  const [uploadAnalysis, setUploadAnalysis] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [uploadDataUri, setUploadDataUri] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [areaLabel, setAreaLabel] = useState('目前位置');
  const [geoStatus, setGeoStatus] = useState('尚未啟用定位');
  const [geoOrigin, setGeoOrigin] = useState(null);
  const [geoCoords, setGeoCoords] = useState(defaultMapCenter);
  const [realPlaces, setRealPlaces] = useState(defaultRealPlaces);
  const [placeStatus, setPlaceStatus] = useState('真實地點同步中');
  const [cameraOpen, setCameraOpen] = useState(null);
  const [cameraPose, setCameraPose] = useState('揮手');
  const [cameraPrivacy, setCameraPrivacy] = useState('公開');
  const [cameraScale, setCameraScale] = useState(1);
  const [cameraX, setCameraX] = useState(48);
  const [cameraY, setCameraY] = useState(13);
  const [routeDraftName, setRouteDraftName] = useState('');
  const [routeDraftPlaceIds, setRouteDraftPlaceIds] = useState(['maple-garden', 'blue-cafe']);
  const mapCenter = geoCoords || defaultMapCenter;

  useEffect(() => {
    localStorage.setItem('footprint-sprout-v4-state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('此裝置不支援 GPS 定位');
      return undefined;
    }
    setGeoStatus('等待使用者允許定位...');
    const watcher = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords;
        setGeoStatus(`GPS 已連線，精度約 ${Math.round(accuracy)}m${speed ? `，速度 ${speed.toFixed(1)}m/s` : ''}`);
        setGeoCoords({ latitude, longitude });
        setGeoOrigin((currentOrigin) => currentOrigin || { latitude, longitude });
        setState((current) => {
          const origin = geoOrigin || { latitude, longitude };
          const next = structuredClone(current);
          const x = 50 + (longitude - origin.longitude) * 48000;
          const y = 50 - (latitude - origin.latitude) * 48000;
          next.position = {
            x: Math.max(8, Math.min(92, Math.round(x * 10) / 10)),
            y: Math.max(8, Math.min(92, Math.round(y * 10) / 10)),
          };
          return next;
        });
        try {
          const response = await fetch(`/api/reverse-geocode?lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          if (data.ok && data.area) setAreaLabel(data.area);
        } catch {
          setAreaLabel('目前位置');
        }
      },
      (error) => {
        setGeoStatus(error.code === 1
          ? '定位被拒絕；手機區網 HTTP 可能也會擋 GPS，公開 HTTPS 後可正常使用'
          : '定位暫時不可用，先使用模擬移動');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [geoOrigin]);

  useEffect(() => {
    const controller = new AbortController();
    const layer = typeof state.mapLayer === 'string' && mapLayers.some((item) => item.id === state.mapLayer)
      ? state.mapLayer
      : 'all';
    setPlaceStatus('正在從地圖服務抓附近真實地點...');
    fetch(`/api/nearby-places?lat=${mapCenter.latitude}&lon=${mapCenter.longitude}&layer=${layer}&radius=900`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error?.message || data.error || 'nearby places failed');
        if (data.places?.length) {
          setRealPlaces(data.places);
        }
        setPlaceStatus(data.provider === 'google'
          ? `Google Maps 已載入 ${data.places?.length || 0} 個真實地點`
          : `OpenStreetMap 已載入 ${data.places?.length || 0} 個真實地點`);
        if (data.places?.[0] && !data.places.some((place) => place.id === selectedId)) {
          setSelectedId(data.places[0].id);
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setRealPlaces((current) => current.length ? current : defaultRealPlaces);
        setPlaceStatus('真實地點備援');
      });
    return () => controller.abort();
  }, [mapCenter.latitude, mapCenter.longitude, state.mapLayer, selectedId]);

  const activePet = state.pets.find((pet) => pet.id === state.activePetId) || state.pets[0];
  const activeLayer = typeof state.mapLayer === 'string' && mapLayers.some((item) => item.id === state.mapLayer)
    ? state.mapLayer
    : 'all';
  const mapTiles = useMemo(() => buildMapTiles(mapCenter), [mapCenter.latitude, mapCenter.longitude]);
  const googleFrameSrc = useMemo(() => googleMapSrc(mapCenter), [mapCenter.latitude, mapCenter.longitude]);
  const seedLocations = useMemo(() => defaultRealPlaces.map((place, index) => makeRealLocation(place, index, defaultMapCenter)), []);
  const visibleRealPlaces = useMemo(() => {
    const liveMatches = realPlaces.filter((place) => placeMatchesLayer(place, activeLayer));
    if (liveMatches.length) return liveMatches;
    const seedMatches = defaultRealPlaces.filter((place) => placeMatchesLayer(place, activeLayer));
    if (seedMatches.length) return seedMatches;
    return realPlaces.length ? realPlaces : defaultRealPlaces;
  }, [realPlaces, activeLayer]);
  const realLocations = useMemo(() => visibleRealPlaces.map((place, index) => makeRealLocation(place, index, mapCenter)), [visibleRealPlaces, mapCenter.latitude, mapCenter.longitude]);
  useEffect(() => {
    if (visibleRealPlaces.length && !visibleRealPlaces.some((place) => place.id === selectedId)) {
      setSelectedId(visibleRealPlaces[0].id);
    }
  }, [visibleRealPlaces, selectedId]);
  const localLocations = realLocations.length ? realLocations : [makeLoadingLocation(placeStatus)];
  const selected = localLocations.find((loc) => loc.id === selectedId) || localLocations[0];
  const target = localLocations.find((loc) => loc.id === state.targetId) || seedLocations.find((loc) => loc.id === state.targetId);
  const allRoutes = useMemo(() => [...routes, ...(state.customRoutes || [])], [state.customRoutes]);
  const visited = Boolean(state.visits[selected.id]);
  const accessories = localLocations.map((loc) => ({ ...loc.accessory, locName: loc.name, locId: loc.id }));
  const unlocked = new Set(state.unlockedAccessories);
  const selectedNotes = [...selected.notes, ...(state.playerNotes[selected.id] || [])]
    .filter((note) => !state.blockedUsers.includes(note.user));
  const filteredLocations = realLocations.length ? localLocations : [];
  const nearbySuggestions = [...localLocations]
    .filter((loc) => loc.real)
    .sort((a, b) => a.steps - b.steps)
    .slice(0, 3);
  const routeDistance = target ? Math.max(0, target.steps - state.routeProgress) : 0;
  const arrived = target && routeDistance === 0;
  const dwellProgress = target ? state.dwell[target.id] || 0 : 0;
  const squad = state.squadIds.map((id) => state.pets.find((pet) => pet.id === id)).filter(Boolean);
  const petStats = useMemo(() => ({
    firstPlace: (activePet.memoryLog || []).find((item) => item.type === 'visit')?.title.replace('到訪 ', '') || '尚未到訪',
    routes: (activePet.memoryLog || []).filter((item) => item.type === 'route').length,
    photos: state.memoryCards.filter((card) => card.petName === activePet.name).length,
    helps: (activePet.memoryLog || []).filter((item) => item.type === 'note' || item.type === 'answer').length,
  }), [activePet, state.memoryCards]);

  const stats = useMemo(() => [
    { label: '今日步數', value: state.totalSteps.toLocaleString(), icon: Footprints },
    { label: '記憶碎片', value: state.fragments, icon: Gem },
    { label: '小隊數量', value: squad.length, icon: Orbit },
    { label: '地點記憶物', value: state.unlockedAccessories.length, icon: Award },
  ], [state.fragments, state.totalSteps, state.unlockedAccessories.length, squad.length]);

  function update(mutator) {
    setState((current) => {
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  }

  function changeMapLayer(layerId) {
    const nextLayer = mapLayers.some((layer) => layer.id === layerId) ? layerId : 'all';
    const nextPlace = realPlaces.find((place) => placeMatchesLayer(place, nextLayer))
      || defaultRealPlaces.find((place) => placeMatchesLayer(place, nextLayer))
      || realPlaces[0]
      || defaultRealPlaces[0];
    if (nextPlace) setSelectedId(nextPlace.id);
    update((next) => {
      next.mapLayer = nextLayer;
    });
  }

  function setJourney(key, value) {
    update((next) => {
      next.journey = { ...next.journey, [key]: value };
    });
  }

  function startSuggestedJourney() {
    const theme = journeyThemes.find((item) => item.id === state.journey.theme);
    const matched = localLocations.find((loc) => theme && (loc.tags.includes(theme.label.replace('城市', '')) || loc.type.includes(theme.label.slice(0, 2))))
      || nearbySuggestions[0];
    if (!matched?.real) return;
    startNavigation(matched.id);
  }

  function claimDailyMission(id) {
    const mission = dailyMissions.find((item) => item.id === id);
    if (!mission || state.dailyClaimed.includes(id)) return;
    const completed = id === 'steps'
      ? state.totalSteps >= 1000
      : id === 'note'
        ? Object.values(state.playerNotes).some((notes) => notes.some((note) => note.user === '你' && !note.text.startsWith('回答')))
        : state.memoryCards.length > 0;
    if (!completed) return;
    update((next) => {
      next.dailyClaimed.push(id);
      next.fragments += mission.reward;
    });
  }

  function buyMarketPack(pack) {
    update((next) => {
      next.fragments += pack.fragments;
      next.marketPurchases.unshift({ ...pack, date: today });
    });
  }

  function reportContent(kind, targetLabel) {
    update((next) => {
      next.moderationQueue.unshift({
        id: `report-${Date.now()}`,
        kind,
        targetLabel,
        status: '待審核',
        date: today,
      });
    });
  }

  function blockUser(user) {
    if (!user || user === '你') return;
    update((next) => {
      if (!next.blockedUsers.includes(user)) next.blockedUsers.push(user);
    });
  }

  function toggleSafetySetting(key) {
    update((next) => {
      next.safetySettings[key] = !next.safetySettings[key];
    });
  }

  function deleteMemoryCard(id) {
    update((next) => {
      next.memoryCards = next.memoryCards.filter((card) => card.id !== id);
    });
  }

  function startNavigation(id) {
    update((next) => {
      next.targetId = id;
      next.routeProgress = 0;
      next.dwell[id] = 0;
    });
    setSelectedId(id);
    setActiveTab('map');
  }

  function stepForward() {
    if (!target) return;
    const isWalk = state.speedMode === 'walk';
    const chunk = isWalk ? 240 : 760;
    const nextProgress = Math.min(target.steps, state.routeProgress + chunk);
    const ratio = nextProgress / target.steps;
    update((next) => {
      next.routeProgress = nextProgress;
      next.position = {
        x: Math.round((18 + (target.coord.x - 18) * ratio) * 10) / 10,
        y: Math.round((38 + (target.coord.y - 38) * ratio) * 10) / 10,
      };
      if (isWalk) {
        next.totalSteps += chunk;
        next.fragments += nextProgress === target.steps ? 2 : 1;
        next.squadIds.forEach((id) => {
          const pet = next.pets.find((item) => item.id === id);
          if (!pet) return;
          pet.steps += chunk;
          pet.affection = Math.min(100, pet.affection + 2);
          pet.level = Math.max(pet.level, Math.floor(pet.steps / 1500) + 1);
        });
      }
    });
  }

  function verifyStay() {
    if (!target || state.routeProgress < target.steps) return;
    update((next) => {
      const updated = Math.min(target.dwellGoal, (next.dwell[target.id] || 0) + 1);
      next.dwell[target.id] = updated;
      const dailyKey = `${target.id}-${today}`;
      if (updated >= target.dwellGoal && (!next.visits[target.id] || next.visits[target.id].lastDailyKey !== dailyKey)) {
        next.visits[target.id] = {
          date: today,
          walked: next.speedMode === 'walk',
          count: (next.visits[target.id]?.count || 0) + 1,
          lastDailyKey: dailyKey,
        };
        next.fragments += target.reward + next.squadIds.length;
        if (!next.unlockedAccessories.includes(target.accessory.id)) {
          next.unlockedAccessories.push(target.accessory.id);
        }
        next.squadIds.forEach((id) => {
          const pet = next.pets.find((item) => item.id === id);
          if (!pet) return;
          pet.memoryLog = [
            {
              type: 'visit',
              title: `到訪 ${target.name}`,
              detail: `${next.speedMode === 'walk' ? '步行採集' : '移動到訪'}，取得 ${target.accessory.name}`,
              date: today,
            },
            ...(pet.memoryLog || []),
          ].slice(0, 12);
        });
      }
    });
  }

  function saveNote() {
    if (!visited || !noteText.trim()) return;
    update((next) => {
      next.playerNotes[selected.id] = [
        ...(next.playerNotes[selected.id] || []),
        { user: '你', text: noteText.trim(), helpful: 0, date: today },
      ];
      next.fragments += 5;
      const pet = next.pets.find((item) => item.id === next.activePetId);
      if (pet) {
        pet.memoryLog = [
          { type: 'note', title: `留下 ${selected.name} 筆記`, detail: noteText.trim(), date: today },
          ...(pet.memoryLog || []),
        ].slice(0, 12);
      }
    });
    setNoteText('');
  }

  function answerQuestion() {
    if (!visited || !questionText.trim()) return;
    update((next) => {
      next.fragments += 5;
      next.playerNotes[selected.id] = [
        ...(next.playerNotes[selected.id] || []),
        { user: '你', text: `回答旅人提問：${questionText.trim()}`, helpful: 1, date: today },
      ];
      const pet = next.pets.find((item) => item.id === next.activePetId);
      if (pet) {
        pet.memoryLog = [
          { type: 'answer', title: `解答 ${selected.name} 的問題`, detail: questionText.trim(), date: today },
          ...(pet.memoryLog || []),
        ].slice(0, 12);
      }
    });
    setQuestionText('');
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    const preview = URL.createObjectURL(file);
    setUploadPreview(preview);
    setAiStatus('正在分析圖片主角輪廓...');
    const dataUri = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setUploadDataUri(dataUri);
    const analysis = await analyzeImageFeatures(file);
    setUploadAnalysis(analysis);
    const needsReview = /person|human/.test(analysis.profile) || analysis.confidence < 0.22;
    if (needsReview) reportContent('生成安全檢查', file.name);
    setAiStatus(needsReview
      ? `已抓取主角特徵：${analysis.profile}，已先送安全檢查佇列`
      : `已抓取主角特徵：${analysis.profile}，輪廓複雜度 ${Math.round(analysis.edgeDensity * 100)}%`);
    if (!petPrompt.trim()) setPetPrompt(file.name.replace(/\.[^.]+$/, ''));
  }

  async function generatePet() {
    if (state.fragments < 100 || (!petPrompt.trim() && !uploadAnalysis)) return;
    const prompt = petPrompt || uploadName || '照片記憶';
    setAiStatus('正在送出 AI 3D 任務...');
    let backendResult = null;
    if (uploadDataUri) {
      try {
        const response = await fetch('/api/generate-3d-pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUri: uploadDataUri,
            prompt,
            mode: petMode,
            features: uploadAnalysis,
          }),
        });
        backendResult = await response.json();
      } catch (error) {
        backendResult = { ok: false, provider: 'local-feature-model', error: String(error) };
      }
    }
    const pet = {
      ...makePetFromPrompt(prompt, petMode, uploadAnalysis),
      aiProvider: backendResult?.provider || 'local-feature-model',
      aiTaskId: backendResult?.taskId || null,
      modelUrl: null,
      memoryLog: [
        {
          type: 'born',
          title: `由 ${uploadName || '上傳照片'} 生成`,
          detail: uploadAnalysis?.detectedClass
            ? `辨識主角：${uploadAnalysis.detectedClass}，形體 ${uploadAnalysis.profile}`
            : '使用圖片主色與輪廓建立 3D 特徵',
          date: today,
        },
      ],
    };
    update((next) => {
      next.fragments -= 100;
      next.pets.push(pet);
      next.activePetId = pet.id;
      if (!next.squadIds.includes(pet.id)) next.squadIds.push(pet.id);
    });
    setAiStatus(backendResult?.provider === 'meshy'
      ? `已送出 Meshy 3D 任務：${backendResult.taskId}`
      : '未設定 AI 3D 金鑰，已使用本機主角特徵生成模型');
  }

  function equipAccessory(accessory) {
    update((next) => {
      const pet = next.pets.find((item) => item.id === next.activePetId);
      if (pet) pet.equipped[accessory.slot] = accessory.id;
    });
  }

  function toggleSquad(id) {
    update((next) => {
      if (next.squadIds.includes(id)) {
        next.squadIds = next.squadIds.filter((item) => item !== id);
      } else {
        next.squadIds.push(id);
      }
      if (!next.squadIds.length) next.squadIds = [next.activePetId];
    });
  }

  function saveMemoryCard() {
    const loc = localLocations.find((item) => item.id === cameraOpen);
    if (!loc || !state.visits[loc.id]) return;
    update((next) => {
      const dailyKey = `${loc.id}-${today}`;
      const firstToday = !next.memoryCards.some((card) => card.dailyKey === dailyKey);
      next.memoryCards.unshift({
        id: `card-${Date.now()}`,
        dailyKey,
        locId: loc.id,
        locName: loc.name,
        petName: activePet.name,
        pose: cameraPose,
        privacy: cameraPrivacy,
        scale: cameraScale,
        x: cameraX,
        y: cameraY,
        date: today,
        steps: next.totalSteps,
      });
      const pet = next.pets.find((item) => item.id === next.activePetId);
      if (pet) pet.affection = Math.min(100, pet.affection + 6);
      if (pet) {
        pet.memoryLog = [
          {
            type: 'photo',
            title: `和 ${loc.name} 合照`,
            detail: `${cameraPose} · ${cameraPrivacy} · ${next.totalSteps.toLocaleString()} 步`,
            date: today,
          },
          ...(pet.memoryLog || []),
        ].slice(0, 12);
      }
      if (firstToday) next.fragments += 3;
    });
    setCameraOpen(null);
  }

  function startRoute(routeId) {
    const selectedRoute = allRoutes.find((item) => item.id === routeId);
    if (!selectedRoute) return;
    const firstUnvisited = selectedRoute.placeIds.find((id) => !state.visits[id]) || selectedRoute.placeIds[0];
    update((next) => { next.activeRouteId = routeId; });
    startNavigation(firstUnvisited);
  }

  function completeRoute(routeId) {
    const selectedRoute = allRoutes.find((item) => item.id === routeId);
    if (!selectedRoute) return;
    const allVisited = selectedRoute.placeIds.every((id) => state.visits[id]);
    if (!allVisited || state.completedRoutes.includes(routeId)) return;
    update((next) => {
      next.completedRoutes.push(routeId);
      next.fragments += selectedRoute.reward;
      next.squadIds.forEach((id) => {
        const pet = next.pets.find((item) => item.id === id);
        if (!pet) return;
        pet.memoryLog = [
          {
            type: 'route',
            title: `完成 ${selectedRoute.name}`,
            detail: `${selectedRoute.placeIds.length} 個地點 · +${selectedRoute.reward} 記憶碎片`,
            date: today,
          },
          ...(pet.memoryLog || []),
        ].slice(0, 12);
      });
    });
  }

  function toggleRoutePlace(id) {
    setRouteDraftPlaceIds((current) => (
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    ));
  }

  function createCustomRoute() {
    if (routeDraftPlaceIds.length < 2) return;
    const routeName = routeDraftName.trim() || `${areaLabel} 我的散步線`;
    update((next) => {
      next.customRoutes = [
        ...(next.customRoutes || []),
        {
          id: `custom-${Date.now()}`,
          name: routeName,
          placeIds: routeDraftPlaceIds,
          reward: 10 + routeDraftPlaceIds.length * 3,
          custom: true,
        },
      ];
      next.fragments += 4;
    });
    setRouteDraftName('');
    setRouteDraftPlaceIds([]);
  }

  function resetProgress() {
    localStorage.removeItem('footprint-sprout-v4-state');
    setState(initialState);
    setSelectedId('maple-garden');
  }

  return (
    <div className="appShell">
      <aside className="side">
        <div className="brand">
          <div className="brandMark"><Footprints size={22} /></div>
          <div>
            <strong>Footprint Sprout</strong>
            <span>{areaLabel}</span>
          </div>
        </div>
        <PetPanel pet={activePet} accessories={accessories} />
        <nav className="tabs" aria-label="主要功能">
          {[
            ['map', Compass, '探索地圖'],
            ['pet', Cuboid, '3D 工坊'],
            ['collection', Trophy, '收藏冊'],
            ['routes', Route, '散步路線'],
            ['safety', ShieldAlert, '安全'],
          ].map(([id, Icon, label]) => (
            <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="ghost wide" onClick={resetProgress}>
          <RefreshCw size={16} />
          重置示範進度
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="areaChip">{areaLabel}</span>
            <h1>今日散步</h1>
            <p>{geoStatus}</p>
          </div>
          <div className="statGrid">
            {stats.map(({ label, value, icon: Icon }) => (
              <div className="stat" key={label}>
                <Icon size={18} />
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </header>

        <div className="questDock">
          <div>
            <span>今日任務</span>
            <strong>{target ? `帶隊前往 ${target.name}` : '選一個地點派出小隊'}</strong>
          </div>
          <div>
            <span>採集加成</span>
            <strong>{squad.length} 隻出隊 · 步行才有碎片加成</strong>
          </div>
          <button className="primary" disabled={!selected.real} onClick={() => startNavigation(selected.id)}>
            <Navigation size={16} />
            開始探險
          </button>
        </div>

        {activeTab === 'map' && (
          <section className="workbench twoCol mapScreen">
            <div className="bloomHome">
              <div className="questMapHero">
                <div className="questMapTop">
                  <span className="walkLogo">走</span>
                  <div>
                    <strong>不為什麼，就去走走</strong>
                    <small>{areaLabel} · 寵物陪伴探索</small>
                  </div>
                  <b>陪伴版</b>
                </div>
                <div className="softMap">
                  <span className="mapBadge">示範區域</span>
                  <span className="mapProvider">OpenStreetMap</span>
                  <div className="rangeCircle" />
                  <button className="startPin" onClick={startSuggestedJourney}>起</button>
                  <span className="mapNotice">尚未實地踏查，不作正式導航</span>
                </div>
              </div>

              <div className="sproutRail">
                <button>
                  <Award size={18} />
                  <span>旅囊</span>
                  <small>{state.unlockedAccessories.length + 3}</small>
                </button>
                <button>
                  <Heart size={18} />
                  <span>靈伴</span>
                  <small>{squad.length}</small>
                </button>
                <button>
                  <MessageSquareText size={18} />
                  <span>訊息</span>
                  <i />
                </button>
              </div>

              <div className="pulseCard">
                <div className="pulseMap">
                  <span className="locationChip"><MapPin size={15} /> {areaLabel}</span>
                  <span className="adventureToast">今日喚醒 {Object.keys(state.visits).length + 3} 顆地點種子</span>
                  <div className="dailyRoad r1" />
                  <div className="dailyRoad r2" />
                  <div className="dailyRiver" />
                  <div className="dailyDot" />
                  <div className="pulseOrb">
                    <span>{state.totalSteps.toLocaleString()}</span>
                    <em>足跡能量</em>
                  </div>
                  <div className="seedBeacon"><Sparkles size={17} /></div>
                </div>
                <div className="traceStrip">
                  <span>{new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())}</span>
                  <strong>{state.fragments} 記憶碎片</strong>
                </div>
              </div>

              <div className="journeyDeck">
                <span className="eyebrow">給自己一段沒有目的的時間</span>
                <h2>今天想怎麼感受這座城市？</h2>
                <p>我們不先告訴你終點，只依你的時間與狀態，慢慢揭露下一步。</p>
                <div className="companionTalk">
                  <Creature3D pet={activePet} mini />
                  <div>
                    <span>你唯一的同行夥伴</span>
                    <strong>{activePet.name}</strong>
                    <p>「選一段剛好的時間，我陪你慢慢看看。」</p>
                  </div>
                </div>
                <div className="choiceBlock">
                  <span>01 我現在有</span>
                  <div className="choiceGrid">
                    {journeyTimes.map((item) => (
                      <button key={item} className={state.journey.time === item ? 'selectedChoice' : ''} onClick={() => setJourney('time', item)}>{item}</button>
                    ))}
                  </div>
                </div>
                <div className="choiceBlock">
                  <span>02 想看見</span>
                  <div className="choiceGrid">
                    {journeyThemes.map((item) => (
                      <button key={item.id} className={state.journey.theme === item.id ? 'selectedChoice' : ''} onClick={() => setJourney('theme', item.id)}>
                        <i>{item.mark}</i>{item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="selectRow">
                  <label>
                    <span>探索方式</span>
                    <select value={state.journey.mode} onChange={(event) => setJourney('mode', event.target.value)}>
                      {['自己走走', '和朋友一起'].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>行動條件</span>
                    <select value={state.journey.condition} onChange={(event) => setJourney('condition', event.target.value)}>
                      {['一般步行', '慢慢走', '避開階梯'].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
                <button className="primary wide" onClick={startSuggestedJourney}>
                  開始示範旅程
                  <Navigation size={17} />
                </button>
              </div>

              <div className="missionCard">
                <div>
                  <strong>把今天的路線澆亮</strong>
                  <span><i style={{ width: `${Math.min(100, (state.totalSteps / 1000) * 100)}%` }} /></span>
                  <small>{Math.min(100, Math.round((state.totalSteps / 1000) * 100))}% / 1000 步</small>
                </div>
                <div className="tinyCompanion"><Sparkles size={16} /></div>
                <b />
              </div>

              <div className="profileShop">
                <button onClick={() => setActiveTab('pet')}><span className="avatarMini" /> 我的寵物</button>
                <button onClick={() => setActiveTab('collection')}><Store size={18} /> 記憶市集</button>
              </div>

              <div className="flowerField">
                <div className="terrainBadge">{areaLabel} 正在同步</div>
                <div className="flower f1" />
                <div className="flower f2" />
                <div className="flower f3" />
                <div className="flower f4" />
                <div className="flower f5" />
                <div className="playerFigure">
                  <span className="head" />
                  <span className="body" />
                  <span className="leg l" />
                  <span className="leg r" />
                </div>
                {squad.slice(0, 5).map((pet, index) => (
                  <span key={pet.id} className={`fieldBuddy b${index}`} style={{ '--buddy': pet.color }} />
                ))}
                <button className="fieldMenu"><span /><span /><span /></button>
                <button className="fieldCompass"><Compass size={26} /></button>
                <button className="fieldWhistle"><Orbit size={30} /></button>
              </div>
            </div>
            <div className="mapPane">
              <div className="mapToolbar">
                <div className="segmented">
                  <button className={state.speedMode === 'walk' ? 'selected' : ''} onClick={() => update((next) => { next.speedMode = 'walk'; })}>
                    <Footprints size={16} /> 步行
                  </button>
                  <button className={state.speedMode === 'ride' ? 'selected' : ''} onClick={() => update((next) => { next.speedMode = 'ride'; })}>
                    <Bike size={16} /> 搭車
                  </button>
                </div>
                <div className="layerScroller">
                  {mapLayers.map((layer) => (
                    <button key={layer.id} className={activeLayer === layer.id ? 'activeLayer' : ''} onClick={() => changeMapLayer(layer.id)}>
                      <Layers size={14} />
                      {layer.label}
                    </button>
                  ))}
                </div>
                <div className="placeDataStatus">
                  <MapPin size={15} />
                  <span>{placeStatus}</span>
                </div>
                {target && (
                  <div className="routeStatus">
                    <Navigation size={16} />
                    <span>{target.name}</span>
                    <strong>{routeDistance} 步</strong>
                  </div>
                )}
              </div>

              <div className="cityMap" aria-label={`${areaLabel} 探索地圖`}>
                <iframe
                  className="googleMapEmbed"
                  title={`${areaLabel} Google 地圖`}
                  src={googleFrameSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="osmTiles" aria-hidden="true">
                  {mapTiles.map((tile) => (
                    <img
                      key={`${tile.x}-${tile.y}`}
                      src={tile.url}
                      alt=""
                      loading="lazy"
                      style={{ left: `${tile.left}px`, top: `${tile.top}px` }}
                    />
                  ))}
                </div>
                <div className="road roadA" />
                <div className="road roadB" />
                <div className="road roadC" />
                <div className="river" />
                <span className="osmCredit">Google Maps / OpenStreetMap fallback</span>
                <div className="player" style={{ left: `${state.position.x}%`, top: `${state.position.y}%` }}>
                  <PawPrint size={18} />
                </div>
                {squad.map((pet, index) => (
                  <div
                    className="squadDot"
                    key={pet.id}
                    style={{
                      left: `${state.position.x - 2.2 + index * 1.8}%`,
                      top: `${state.position.y + 3 + (index % 2) * 2}%`,
                      '--dot': pet.color,
                    }}
                    title={pet.name}
                  />
                ))}
                {filteredLocations.map((loc) => {
                  const isVisited = Boolean(state.visits[loc.id]);
                  const isTarget = state.targetId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      className={`pin ${isVisited ? 'visited' : ''} ${isTarget ? 'target' : ''} ${selectedId === loc.id ? 'selectedPin' : ''}`}
                      style={{ left: `${loc.coord.x}%`, top: `${loc.coord.y}%`, '--pin': loc.palette[0] }}
                      onClick={() => setSelectedId(loc.id)}
                      title={loc.name}
                    >
                      {isVisited ? <CheckCircle2 size={17} /> : <MapPin size={17} />}
                    </button>
                  );
                })}
                {selected?.real && (
                  <div
                    className="selectedPlaceBubble"
                    style={{ left: `clamp(154px, ${selected.coord.x}%, calc(100% - 154px))`, top: `${selected.coord.y}%`, '--pin': selected.palette[0] }}
                  >
                    <span>{selected.type}</span>
                    <strong>{selected.name}</strong>
                    <small>{selected.address || selected.description}</small>
                    {selected.googleMapsUri && (
                      <a href={selected.googleMapsUri} target="_blank" rel="noreferrer">在 Google Maps 開啟</a>
                    )}
                  </div>
                )}
              </div>

              <div className="actionStrip">
                <button className="primary" disabled={!selected.real} onClick={() => startNavigation(selected.id)}>
                  <Navigation size={17} />
                  派小隊前往
                </button>
                <button className="secondary" disabled={!target} onClick={stepForward}>
                  <Footprints size={17} />
                  {state.speedMode === 'walk' ? '帶隊前進 240 步' : '移動一段路'}
                </button>
                <button className="secondary" disabled={!arrived} onClick={verifyStay}>
                  <UserRoundCheck size={17} />
                  採集認證 {target ? `${dwellProgress}/${target.dwellGoal}` : '0/0'}
                </button>
              </div>
              <div className="nearbyList">
                <div className="sectionTitle compact">
                  <Compass size={18} />
                  <h3>步行 15 分鐘內</h3>
                </div>
                {nearbySuggestions.map((loc) => (
                  <button key={loc.id} onClick={() => setSelectedId(loc.id)}>
                    <span style={{ '--pin': loc.palette[0] }} />
                    <strong>{loc.name}</strong>
                    <small>{loc.steps} 步 · {loc.type}</small>
                  </button>
                ))}
              </div>
            </div>

            <PlacePanel
              location={selected}
              visited={visited}
              visit={state.visits[selected.id]}
              notes={selectedNotes}
              noteText={noteText}
              setNoteText={setNoteText}
              saveNote={saveNote}
              questionText={questionText}
              setQuestionText={setQuestionText}
              answerQuestion={answerQuestion}
              startNavigation={startNavigation}
              openCamera={() => setCameraOpen(selected.id)}
              accessoryUnlocked={unlocked.has(selected.accessory.id)}
              squadSize={squad.length}
              onReport={(kind, label) => reportContent(kind, label)}
              onBlock={blockUser}
            />
          </section>
        )}

        {activeTab === 'pet' && (
          <section className="workbench twoCol studioScreen">
            <div className="forge">
              <div className="sectionTitle">
                <Sparkles size={20} />
                <h2>照片生成 3D 記憶靈</h2>
              </div>
              <div className="uploadGrid">
                <label className="uploadMock">
                  {uploadPreview ? <img src={uploadPreview} alt="上傳預覽" /> : <ImageUp size={32} />}
                  <span>{uploadName || '上傳一張照片'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                </label>
                <div className="preview3d">
                  {uploadAnalysis ? (
                    <Creature3D pet={makePetFromPrompt(petPrompt || uploadName || '照片記憶', petMode, uploadAnalysis)} />
                  ) : (
                    <div className="empty3dPreview">
                      <ImageUp size={28} />
                      <span>上傳照片後才生成 3D 預覽</span>
                    </div>
                  )}
                </div>
              </div>
              {uploadAnalysis && (
                <div className="analysisPanel">
                  <div className="paletteRow">
                    {uploadAnalysis.palette.map((color) => <i key={color} style={{ background: color }} />)}
                    <span>主色從圖片主角區域抽取</span>
                  </div>
                  <div className="featureGrid">
                    <span>形體：{uploadAnalysis.profile}</span>
                    <span>辨識：{uploadAnalysis.detectedClass || '未判定'}</span>
                    <span>比例：{uploadAnalysis.aspect}</span>
                    <span>主角佔比：{Math.round(uploadAnalysis.subjectRatio * 100)}%</span>
                    <span>輪廓複雜：{Math.round(uploadAnalysis.edgeDensity * 100)}%</span>
                    <span>附加：{uploadAnalysis.appendages.join('、')}</span>
                  </div>
                </div>
              )}
              {aiStatus && <div className="aiStatus">{aiStatus}</div>}
              <label className="field">
                <span>創生描述</span>
                <textarea value={petPrompt} onChange={(event) => setPetPrompt(event.target.value)} placeholder="咖啡杯、夕陽、公車、手繪怪物、街景招牌..." />
              </label>
              <div className="modeRow">
                {['保留特徵', '奇想融合', '完全驚喜'].map((mode) => (
                  <button key={mode} className={petMode === mode ? 'chip activeChip' : 'chip'} onClick={() => setPetMode(mode)}>
                    {mode}
                  </button>
                ))}
              </div>
              <button className="primary wide" disabled={state.fragments < 100 || (!petPrompt.trim() && !uploadAnalysis)} onClick={generatePet}>
                <Gem size={17} />
                消耗 100 記憶碎片生成特徵 3D 寵物
              </button>
            </div>

            <div className="petList">
              <div className="sectionTitle">
                <PawPrint size={20} />
                <h2>伴走小隊</h2>
              </div>
              {state.pets.map((pet) => (
                <article key={pet.id} className={`petRow ${state.activePetId === pet.id ? 'chosen' : ''}`}>
                  <button className="petPick" onClick={() => update((next) => { next.activePetId = pet.id; })}>
                    <Creature3D pet={pet} mini />
                    <div>
                      <strong>{pet.name}</strong>
                      <span>{pet.species} · Lv.{pet.level} · {pet.steps.toLocaleString()} 步</span>
                    </div>
                  </button>
                  <button className={state.squadIds.includes(pet.id) ? 'chip activeChip' : 'chip'} onClick={() => toggleSquad(pet.id)}>
                    {state.squadIds.includes(pet.id) ? '出隊中' : '加入小隊'}
                  </button>
                </article>
              ))}
              <div className="petLedger">
                <div className="sectionTitle compact">
                  <Sparkles size={18} />
                  <h3>{activePet.name} 的記憶履歷</h3>
                </div>
                <div className="petStoryStats">
                  <span><MapPin size={14} /> 第一站：{petStats.firstPlace}</span>
                  <span><Route size={14} /> 路線：{petStats.routes}</span>
                  <span><Camera size={14} /> 合照：{petStats.photos}</span>
                  <span><Users size={14} /> 幫助：{petStats.helps}</span>
                </div>
                {(activePet.memoryLog || []).length ? (
                  (activePet.memoryLog || []).slice(0, 6).map((item, index) => (
                    <div className="ledgerItem" key={`${item.type}-${item.date}-${index}`}>
                      <span>{dateLabel(item.date)}</span>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">帶牠到訪、合照或完成路線後，這裡會留下履歷。</p>
                )}
                <button className="ghost wide" onClick={() => reportContent('生成結果', activePet.name)}>
                  <Flag size={16} />
                  檢舉生成結果
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'collection' && (
          <section className="workbench collection">
            <div className="sectionTitle">
              <Trophy size={20} />
              <h2>{areaLabel} 收藏冊與市集</h2>
            </div>
            <div className="rewardBoard">
              <div className="rewardColumn">
                <div className="sectionTitle compact">
                  <Clock size={18} />
                  <h3>每日碎片任務</h3>
                </div>
                {dailyMissions.map((mission) => {
                  const completed = mission.id === 'steps'
                    ? state.totalSteps >= 1000
                    : mission.id === 'note'
                      ? Object.values(state.playerNotes).some((notes) => notes.some((note) => note.user === '你' && !note.text.startsWith('回答')))
                      : state.memoryCards.length > 0;
                  const claimed = state.dailyClaimed.includes(mission.id);
                  return (
                    <button key={mission.id} className={`missionClaim ${completed ? 'done' : ''}`} disabled={!completed || claimed} onClick={() => claimDailyMission(mission.id)}>
                      <span>{mission.label}</span>
                      <strong>{claimed ? '已領取' : `+${mission.reward}`}</strong>
                    </button>
                  );
                })}
              </div>
              <div className="rewardColumn">
                <div className="sectionTitle compact">
                  <ShoppingBag size={18} />
                  <h3>記憶碎片市集</h3>
                </div>
                {marketPacks.map((pack) => (
                  <button key={pack.id} className="marketPack" onClick={() => buyMarketPack(pack)}>
                    <div>
                      <strong>{pack.name}</strong>
                      <span>{pack.bonus}</span>
                    </div>
                    <b>{pack.price} · +{pack.fragments}</b>
                  </button>
                ))}
              </div>
            </div>
            <div className="memoryWall">
              <div className="sectionTitle compact">
                <Camera size={18} />
                <h3>大家的記憶合照</h3>
              </div>
              {state.memoryCards.length ? (
                <div className="memoryGrid">
                  {state.memoryCards.map((card) => (
                    <article className="memoryCard" key={card.id}>
                      <div className="memoryScene">
                        <span>{card.pose}</span>
                      </div>
                      <strong>{card.locName}</strong>
                      <small>{card.petName} · {card.privacy} · {dateLabel(card.date)}</small>
                      <div className="miniActions">
                        <button onClick={() => startNavigation(card.locId)}>帶我的寵物去這裡</button>
                        <button onClick={() => reportContent('合照', card.locName)}>檢舉</button>
                        <button onClick={() => deleteMemoryCard(card.id)}><Trash2 size={14} /></button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="emptyText">完成到訪認證後，和寵物拍合照就會出現在這裡。</p>
              )}
            </div>
            <div className="accessoryGrid">
              {accessories.map((item) => {
                const isUnlocked = unlocked.has(item.id);
                return (
                  <button key={item.id} className={`accessory ${isUnlocked ? 'got' : ''}`} onClick={() => isUnlocked && equipAccessory(item)}>
                    <div className="accessoryIcon" style={{ '--item': item.color }}>
                      {isUnlocked ? <Award size={24} /> : <X size={22} />}
                    </div>
                    <strong>{isUnlocked ? item.name : '剪影記憶物'}</strong>
                    <span>{item.locName}</span>
                    <small>{isUnlocked ? `${item.slot} · 可裝備到 3D 寵物` : '完成到訪採集後解鎖'}</small>
                    {item.locId === 'blue-cafe' && <small className="collabTag">官方合作 · 不影響排序</small>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'routes' && (
          <section className="workbench routeGrid">
            <article className="routeCard routeBuilder">
              <div className="routeHead">
                <PlusCircle size={22} />
                <div>
                  <h2>建立我的散步路線</h2>
                  <p>把真的想走的地點串成一條路線，完成後給小隊記憶履歷與碎片。</p>
                </div>
              </div>
              <label className="field">
                <span>路線名稱</span>
                <input value={routeDraftName} onChange={(event) => setRouteDraftName(event.target.value)} placeholder={`${areaLabel} 週末散步線`} />
              </label>
              <div className="routePlaceGrid">
                {localLocations.map((loc) => (
                  <button
                    key={loc.id}
                    className={routeDraftPlaceIds.includes(loc.id) ? 'selectedPlace' : ''}
                    onClick={() => toggleRoutePlace(loc.id)}
                  >
                    <span style={{ '--pin': loc.palette[0] }} />
                    <strong>{loc.name}</strong>
                    <small>{loc.steps} 步</small>
                  </button>
                ))}
              </div>
              <div className="routeActions">
                <button className="primary" disabled={routeDraftPlaceIds.length < 2} onClick={createCustomRoute}>
                  <Route size={16} />
                  建立路線
                </button>
                <span className="routeHint">{routeDraftPlaceIds.length} 個地點 · 預估獎勵 {10 + routeDraftPlaceIds.length * 3}</span>
              </div>
            </article>

            {allRoutes.map((item) => {
              const allVisited = item.placeIds.every((id) => state.visits[id]);
              const done = state.completedRoutes.includes(item.id);
              return (
                <article className="routeCard" key={item.id}>
                  <div className="routeHead">
                    <Route size={22} />
                    <div>
                      <h2>{item.name}</h2>
                      <p>{item.custom ? '玩家自建路線，完成後會寫進寵物記憶履歷。' : '完成整條路線會讓出隊的記憶靈一起獲得成長。'}</p>
                    </div>
                  </div>
                  <ol>
                    {item.placeIds.map((id) => {
                      const loc = localLocations.find((place) => place.id === id);
                      return (
                        <li key={id} className={state.visits[id] ? 'doneStep' : ''}>
                          <span>{loc.name}</span>
                          {state.visits[id] && <CheckCircle2 size={15} />}
                        </li>
                      );
                    })}
                  </ol>
                  <div className="routeActions">
                    <button className="secondary" onClick={() => startRoute(item.id)}>
                      <Navigation size={16} />
                      開始路線
                    </button>
                    <button className="primary" disabled={!allVisited || done} onClick={() => completeRoute(item.id)}>
                      <Gem size={16} />
                      {done ? '已領取' : `領取 ${item.reward}`}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {activeTab === 'safety' && (
          <section className="workbench safety">
            <div className="safetyBand">
              <ShieldAlert size={24} />
              <div>
                <h2>差異化與安全規則</h2>
                <p>核心是「照片生成 3D 記憶靈＋真實到訪採集」，不用相同命名、外觀、植物軍團或戰鬥採收結構。</p>
              </div>
            </div>
            <div className="safetyControls">
              {[
                ['privateAccount', '私人帳號', '公開頁只顯示匿名化記憶'],
                ['hideHomeZone', '隱藏住家附近起終點', '不公開完整每日移動軌跡'],
                ['delayVisitPosts', '延遲顯示到訪紀錄', '不讓陌生人知道你正在某地'],
                ['stripPhotoGps', '上傳照片移除原始定位', '合照只保留地點記憶，不保留 EXIF GPS'],
                ['allowStrangerMessages', '允許陌生人私訊', '預設關閉，避免未成年風險'],
              ].map(([key, title, text]) => (
                <button key={key} className={state.safetySettings[key] ? 'toggleCard enabled' : 'toggleCard'} onClick={() => toggleSafetySetting(key)}>
                  <span>{state.safetySettings[key] ? 'ON' : 'OFF'}</span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </button>
              ))}
            </div>
            <div className="safetyGrid">
              {[
                ['不像皮克敏的地方', '角色是由玩家圖片抽色生成的 3D 記憶靈，沒有固定物種、葉子頭、拔起或戰鬥採集。'],
                ['用戶上傳圖片', '目前前端會真實讀取圖片、抽出主色並即時產生 3D 模型；正式版再接 AI 3D 生成服務。'],
                ['到訪權限', '未到訪者可觀看筆記與合照，但不能評論、回答、合照或領取地點記憶物。'],
                ['位置隱私', '不公開即時位置，不顯示完整住家路線，照片發布前移除原始 GPS。'],
              ].map(([title, text]) => (
                <div className="policy" key={title}>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <div className="moderationDesk">
              <div>
                <div className="sectionTitle compact">
                  <Flag size={18} />
                  <h3>內容審核佇列</h3>
                </div>
                {state.moderationQueue.length ? state.moderationQueue.map((item) => (
                  <div className="moderationItem" key={item.id}>
                    <strong>{item.kind}</strong>
                    <span>{item.targetLabel}</span>
                    <small>{item.status} · {dateLabel(item.date)}</small>
                  </div>
                )) : <p className="emptyText">目前沒有待處理檢舉。</p>}
              </div>
              <div>
                <div className="sectionTitle compact">
                  <Eye size={18} />
                  <h3>封鎖名單</h3>
                </div>
                {state.blockedUsers.length ? state.blockedUsers.map((user) => <span className="blockedUser" key={user}>{user}</span>) : <p className="emptyText">尚未封鎖任何使用者。</p>}
              </div>
            </div>
          </section>
        )}
      </main>

      {cameraOpen && (
        <MemoryCamera
          location={localLocations.find((item) => item.id === cameraOpen)}
          pet={activePet}
          pose={cameraPose}
          setPose={setCameraPose}
          privacy={cameraPrivacy}
          setPrivacy={setCameraPrivacy}
          scale={cameraScale}
          setScale={setCameraScale}
          x={cameraX}
          setX={setCameraX}
          y={cameraY}
          setY={setCameraY}
          onClose={() => setCameraOpen(null)}
          onSave={saveMemoryCard}
        />
      )}
    </div>
  );
}

function PetPanel({ pet, accessories }) {
  const equipped = Object.values(pet.equipped || {})
    .map((id) => accessories.find((item) => item.id === id))
    .filter(Boolean);
  return (
    <section className="petPanel">
      <Creature3D pet={pet} compact />
      <div className="petMeta">
        <strong>{pet.name}</strong>
        <span>{pet.species}</span>
      </div>
      <div className="meter">
        <span>親密度</span>
        <div><i style={{ width: `${pet.affection}%` }} /></div>
      </div>
      <div className="equipped">
        {equipped.length ? equipped.map((item) => <span key={item.id}>{item.name}</span>) : <span>尚未裝備記憶物</span>}
      </div>
    </section>
  );
}

function Creature3D({ pet, mini = false, compact = false }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const width = mount.clientWidth || 220;
    const height = mount.clientHeight || 220;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 5);
    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(3, 4, 5);
    scene.add(key);

    const group = new THREE.Group();
    const features = {
      ...defaultFeatures,
      ...(pet.features || {}),
      appendages: pet.features?.appendages || defaultFeatures.appendages,
    };
    const bodyMat = new THREE.MeshStandardMaterial({ color: pet.color, roughness: 0.42, metalness: 0.08 });
    const accentMat = new THREE.MeshStandardMaterial({ color: pet.accent, roughness: 0.5 });
    const auraMat = new THREE.MeshStandardMaterial({ color: pet.aura, roughness: 0.25, emissive: pet.aura, emissiveIntensity: 0.15 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#17211f', roughness: 0.6 });

    const profile = features.profile || pet.form || 'organic';
    const isDog = profile === 'dog';
    const isCat = profile === 'cat';
    const isPoultry = ['chicken', 'duck', 'goose'].includes(profile);
    const isPerson = profile === 'person';
    const usesSpecificSilhouette = isDog || isCat || isPoultry || isPerson;
    if (isDog) {
      bodyMat.roughness = 0.34;
      bodyMat.emissive.set(pet.color);
      bodyMat.emissiveIntensity = 0.08;
    }
    const bodyGeometry = profile === 'vehicle'
      ? new THREE.BoxGeometry(1.75, 0.72, 0.88, 3, 2, 2)
      : profile === 'cup'
        ? new THREE.CylinderGeometry(0.62, 0.48, 1.18, 30, 2)
        : profile === 'building'
          ? new THREE.BoxGeometry(1.0, 1.45, 0.86, 2, 5, 2)
          : isDog || isCat || isPoultry
            ? new THREE.CapsuleGeometry(0.48, 1.35, 10, 22)
          : isPerson
            ? new THREE.CapsuleGeometry(0.36, 1.0, 8, 18)
          : profile === 'plant' || profile === 'tall'
            ? new THREE.CapsuleGeometry(0.52, 1.12, 8, 22)
            : profile === 'spiky'
              ? new THREE.IcosahedronGeometry(0.88, 2)
              : profile === 'chunky'
                ? new THREE.DodecahedronGeometry(0.88, 1)
                : new THREE.SphereGeometry(0.86, 32, 24);
    const body = new THREE.Mesh(bodyGeometry, bodyMat);
    if (isDog) {
      body.rotation.z = Math.PI / 2;
      body.scale.set(1.18, 0.78, 0.72);
    }
    if (isCat) {
      body.rotation.z = Math.PI / 2;
      body.scale.set(1.06, 0.62, 0.58);
    }
    if (isPoultry) {
      body.rotation.z = Math.PI / 2;
      body.scale.set(profile === 'goose' ? 1.05 : 0.92, profile === 'goose' ? 0.74 : 0.82, 0.68);
    }
    if (isPerson) {
      body.scale.set(0.9, 1.18, 0.58);
    }
    const aspectScale = Math.min(1.85, Math.max(0.58, features.aspect || 1));
    if (!['vehicle', 'cup', 'building'].includes(profile) && !usesSpecificSilhouette) {
      body.scale.x = profile === 'wide' ? aspectScale : Math.max(0.72, Math.min(1.28, aspectScale));
      body.scale.y = profile === 'tall' || profile === 'plant' ? 1.38 : Math.max(0.72, Math.min(1.22, 1 / aspectScale));
      body.scale.z = profile === 'wide' ? 0.78 : 1;
    }
    body.position.y = 0.24;
    group.add(body);
    const hasVoxels = features.voxels?.length > 10;
    if (!usesSpecificSilhouette && hasVoxels) {
      body.visible = false;
      const gridSize = features.gridSize || 18;
      const longest = Math.max(1, features.aspect || 1);
      const widthScale = features.aspect >= 1 ? 2.45 : 2.45 * features.aspect;
      const heightScale = features.aspect >= 1 ? 2.45 / longest : 2.45;
      features.voxels.forEach((voxel) => {
        const material = new THREE.MeshStandardMaterial({
          color: voxel.color || pet.color,
          roughness: 0.48,
          metalness: 0.04,
        });
        const size = 0.11 + voxel.weight * 0.08;
        const block = new THREE.Mesh(new THREE.BoxGeometry(size * 1.25, size * 1.25, 0.28 + voxel.weight * 0.18), material);
        block.position.set(
          ((voxel.x / (gridSize - 1)) - 0.5) * widthScale,
          (0.5 - (voxel.y / (gridSize - 1))) * heightScale + 0.14,
          Math.sin((voxel.x + voxel.y) * 0.55) * 0.08
        );
        block.rotation.z = (voxel.weight - 0.5) * 0.18;
        group.add(block);
      });
    }

    const faceY = profile === 'building' ? 0.62 : profile === 'vehicle' ? 0.36 : isDog ? 0.48 : 0.5;
    const faceZ = profile === 'vehicle' ? 0.48 : 0.77;
    const core = new THREE.Mesh(new THREE.SphereGeometry(profile === 'cup' ? 0.22 : 0.28, 24, 16), auraMat);
    core.position.set(0, faceY - 0.24, faceZ);
    if (!usesSpecificSilhouette && !hasVoxels) group.add(core);

    const eyeGeo = new THREE.SphereGeometry(0.07, 12, 8);
    const leftEye = new THREE.Mesh(eyeGeo, darkMat);
    leftEye.position.set(isDog ? 0.73 : -0.25, faceY + (isDog ? 0.1 : 0), isDog ? 0.62 : faceZ);
    const rightEye = new THREE.Mesh(eyeGeo, darkMat);
    rightEye.position.set(isDog ? 0.73 : 0.25, faceY - (isDog ? 0.1 : 0), isDog ? 0.62 : faceZ);
    if (!usesSpecificSilhouette) group.add(leftEye, rightEye);

    const footGeo = new THREE.SphereGeometry(0.18, 16, 12);
    const footSpread = profile === 'vehicle' || profile === 'wide' ? 0.62 : 0.38;
    const footPositions = isDog
      ? [[-0.62, -0.42, 0.26], [-0.22, -0.42, 0.26], [0.32, -0.42, 0.26], [0.68, -0.42, 0.26]]
      : [[-footSpread, -0.55, 0.2], [footSpread, -0.55, 0.2]];
    if (isDog || !usesSpecificSilhouette) footPositions.forEach(([x, y, z]) => {
      const foot = new THREE.Mesh(footGeo, accentMat);
      foot.scale.set(isDog ? 0.66 : 1.15, isDog ? 1.65 : 0.55, isDog ? 0.66 : 1);
      foot.position.set(x, y, z);
      group.add(foot);
    });

    if (isDog) {
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), bodyMat);
      head.scale.set(1.02, 0.94, 0.9);
      head.position.set(0.78, 0.42, 0.16);
      group.add(head);

      const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.24, 8, 12), accentMat);
      snout.rotation.x = Math.PI / 2;
      snout.scale.set(1.0, 0.78, 0.7);
      snout.position.set(0.78, 0.36, 0.58);
      group.add(snout);

      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 10), darkMat);
      nose.scale.set(1.08, 0.82, 0.72);
      nose.position.set(0.78, 0.39, 0.77);
      group.add(nose);

      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 12), accentMat);
        ear.position.set(0.78 + side * 0.22, 0.78, 0.05);
        ear.rotation.x = 0.08;
        ear.rotation.z = side * -0.42;
        group.add(ear);
      });

      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.58, 8, 12), accentMat);
      tail.position.set(-1.0, 0.35, 0);
      tail.rotation.z = -0.78;
      group.add(tail);

      [-0.12, 0.12].forEach((x) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), darkMat);
        eye.position.set(0.78 + x, 0.53, 0.55);
        group.add(eye);
      });

      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 18, Math.PI), darkMat);
      mouth.scale.set(0.74, 0.52, 1);
      mouth.position.set(0.78, 0.31, 0.68);
      mouth.rotation.set(0, 0, Math.PI);
      group.add(mouth);
    }

    if (isCat) {
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 26, 18), bodyMat);
      head.scale.set(1.0, 0.86, 0.86);
      head.position.set(0.78, 0.43, 0.04);
      group.add(head);

      const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 7, 10), accentMat);
      snout.rotation.z = Math.PI / 2;
      snout.position.set(1.05, 0.38, 0.04);
      group.add(snout);

      [-0.17, 0.17].forEach((z) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 3), accentMat);
        ear.position.set(0.72, 0.78, z);
        ear.rotation.z = -0.16;
        group.add(ear);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), darkMat);
        eye.position.set(0.98, 0.51, z * 0.7);
        group.add(eye);
      });

      [[-0.48, -0.42, 0.2], [-0.12, -0.42, 0.2], [0.34, -0.42, 0.2], [0.66, -0.42, 0.2]].forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.38, 6, 10), accentMat);
        leg.position.set(x, y, z);
        group.add(leg);
      });

      const tail = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.045, 8, 28, Math.PI * 1.15), accentMat);
      tail.position.set(-0.86, 0.34, -0.08);
      tail.rotation.set(0.2, -0.7, 1.8);
      group.add(tail);
    }

    if (isPoultry) {
      const neckHeight = profile === 'goose' ? 0.62 : 0.2;
      if (profile === 'goose') {
        const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.7, 8, 12), bodyMat);
        neck.position.set(0.62, 0.74, 0);
        neck.rotation.z = -0.28;
        group.add(neck);
      }

      const head = new THREE.Mesh(new THREE.SphereGeometry(profile === 'goose' ? 0.25 : 0.31, 24, 18), bodyMat);
      head.scale.set(profile === 'duck' ? 1.06 : 0.94, profile === 'goose' ? 0.98 : 0.9, 0.88);
      head.position.set(profile === 'goose' ? 0.78 : 0.76, 0.5 + neckHeight, 0.02);
      group.add(head);

      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, profile === 'duck' ? 0.45 : 0.34, 4), accentMat);
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(profile === 'goose' ? 1.05 : 1.06, 0.48 + neckHeight, 0.02);
      beak.scale.z = 0.55;
      group.add(beak);

      [-0.13, 0.13].forEach((z) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), darkMat);
        eye.position.set(profile === 'goose' ? 0.9 : 0.91, 0.59 + neckHeight, z);
        group.add(eye);
      });

      [-0.24, 0.24].forEach((z, index) => {
        const wing = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 12), accentMat);
        wing.scale.set(1.3, 0.52, 0.18);
        wing.position.set(-0.06, 0.25, index ? 0.35 : -0.35);
        wing.rotation.y = index ? -0.28 : 0.28;
        group.add(wing);
      });

      if (profile === 'chicken') {
        const comb = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), auraMat);
        comb.position.set(0.72, 0.86, 0);
        group.add(comb);
      }

      [[-0.18, -0.44, 0.18], [0.28, -0.44, 0.18]].forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.34, 5, 8), darkMat);
        leg.position.set(x, y, z);
        group.add(leg);
        const foot = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 3), accentMat);
        foot.rotation.z = -Math.PI / 2;
        foot.position.set(x + 0.08, y - 0.19, z + 0.04);
        group.add(foot);
      });

      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 5), accentMat);
      tail.rotation.z = Math.PI / 2.6;
      tail.position.set(-0.82, 0.42, 0);
      group.add(tail);
    }

    if (isPerson) {
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 22, 16), accentMat);
      head.position.set(0, 1.05, 0.02);
      group.add(head);

      [-0.32, 0.32].forEach((x) => {
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.62, 6, 10), auraMat);
        arm.position.set(x, 0.35, 0.04);
        arm.rotation.z = x > 0 ? -0.22 : 0.22;
        group.add(arm);
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.55, 6, 10), darkMat);
        leg.position.set(x * 0.45, -0.55, 0.04);
        group.add(leg);
      });

      [-0.08, 0.08].forEach((x) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), darkMat);
        eye.position.set(x, 1.1, 0.22);
        group.add(eye);
      });
    }

    const appendages = new Set(features.appendages || []);
    if (!usesSpecificSilhouette && appendages.has('side-fins')) {
      const finGeo = new THREE.ConeGeometry(0.22, 0.58, 4);
      [-0.78, 0.78].forEach((x, index) => {
        const fin = new THREE.Mesh(finGeo, accentMat);
        fin.position.set(x, 0.15, 0.03);
        fin.rotation.z = index ? -0.65 : 0.65;
        group.add(fin);
      });
    }
    if (appendages.has('ears') || appendages.has('horns')) {
      const hornGeo = new THREE.ConeGeometry(0.17, appendages.has('horns') ? 0.58 : 0.4, appendages.has('horns') ? 5 : 18);
      [-0.36, 0.36].forEach((x, index) => {
        const horn = new THREE.Mesh(hornGeo, accentMat);
        horn.position.set(x, 1.02, 0.08);
        horn.rotation.z = index ? -0.22 : 0.22;
        group.add(horn);
      });
    }
    if (appendages.has('leaf-crown')) {
      const leafGeo = new THREE.ConeGeometry(0.18, 0.62, 4);
      [-0.32, 0, 0.32].forEach((x, index) => {
        const leaf = new THREE.Mesh(leafGeo, auraMat);
        leaf.position.set(x, 1.18 + Math.abs(index - 1) * -0.08, 0.02);
        leaf.rotation.z = (index - 1) * 0.48;
        group.add(leaf);
      });
    }
    if (!isDog && appendages.has('tail')) {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.72, 12), accentMat);
      tail.position.set(features.leftMass > features.rightMass ? 0.92 : -0.92, -0.04, -0.28);
      tail.rotation.z = features.leftMass > features.rightMass ? -1.38 : 1.38;
      group.add(tail);
    }
    if (appendages.has('wheels')) {
      [-0.55, 0.55].forEach((x) => {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.055, 8, 22), darkMat);
        wheel.position.set(x, -0.28, 0.48);
        wheel.rotation.y = Math.PI / 2;
        group.add(wheel);
      });
    }
    if (appendages.has('handle')) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 12, 28, Math.PI * 1.35), accentMat);
      handle.position.set(0.62, 0.26, 0);
      handle.rotation.y = Math.PI / 2;
      group.add(handle);
    }
    if (appendages.has('steam')) {
      [-0.24, 0, 0.24].forEach((x, index) => {
        const steam = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 18, Math.PI * 1.25), auraMat);
        steam.position.set(x, 1.12 + index * 0.1, 0.16);
        steam.rotation.x = Math.PI / 2;
        group.add(steam);
      });
    }
    if (appendages.has('spikes')) {
      const spikeCount = features.edgeDensity > 0.5 ? 10 : 7;
      for (let i = 0; i < spikeCount; i += 1) {
        const angle = (i / spikeCount) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 5), accentMat);
        spike.position.set(Math.cos(angle) * 0.84, 0.28 + Math.sin(angle * 1.7) * 0.36, Math.sin(angle) * 0.28);
        spike.rotation.z = -angle + Math.PI / 2;
        group.add(spike);
      }
    }

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.025, 10, 80), auraMat);
    ring.rotation.x = Math.PI / 2.4;
    ring.position.y = 0.1;
    if (!usesSpecificSilhouette && !hasVoxels) group.add(ring);

    if (pet.equipped?.頭部) {
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.28, 20), accentMat);
      hat.position.y = 1.1;
      group.add(hat);
    }
    if (pet.equipped?.背部) {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.24), accentMat);
      pack.position.set(0, 0.2, -0.82);
      group.add(pack);
    }
    if (pet.equipped?.身體) {
      const cape = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.72, 5), accentMat);
      cape.position.set(0, -0.35, -0.5);
      cape.rotation.x = -0.9;
      group.add(cape);
    }

    scene.add(group);
    const clock = new THREE.Clock();
    let frameId = 0;
    function animate() {
      const time = clock.getElapsedTime();
      group.rotation.y = isDog ? Math.sin(time * 1.1) * 0.08 : usesSpecificSilhouette ? -0.35 + Math.sin(time * 1.25) * 0.38 : time * 0.7;
      group.position.y = Math.sin(time * 2.1) * 0.09;
      ring.rotation.z = time * 0.9;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
      });
      mount.innerHTML = '';
    };
  }, [pet]);

  return <div className={`creature3d ${mini ? 'mini' : ''} ${compact ? 'compact' : ''}`} ref={mountRef} aria-label={`${pet.name} 3D 模型`} />;
}

function PlacePanel({
  location,
  visited,
  visit,
  notes,
  noteText,
  setNoteText,
  saveNote,
  questionText,
  setQuestionText,
  answerQuestion,
  startNavigation,
  openCamera,
  accessoryUnlocked,
  squadSize,
  onReport,
  onBlock,
}) {
  return (
    <aside className="placePanel">
      <div className="placeVisual" style={{ '--c1': location.palette[0], '--c2': location.palette[1], '--c3': location.palette[2] }}>
        <div className="sun" />
        <div className="skyline" />
        <Store size={32} />
      </div>
      <div className="placeHeader">
        <div>
          <span className="eyebrow">{location.district} · {location.type}</span>
          <h2>{location.name}</h2>
        </div>
        {visited ? <span className="badge good">已到訪</span> : <span className="badge locked">未到訪</span>}
      </div>
      <p className="description">{location.description}</p>
      <div className="tagRow">
        {location.tags.map((tag) => <span key={tag}>{tag}</span>)}
      </div>
      <div className="memoryObject">
        <Award size={20} />
        <div>
          <strong>{accessoryUnlocked ? location.accessory.name : '地點記憶物剪影'}</strong>
          <span>{accessoryUnlocked ? `${location.accessory.slot} 已收入收藏冊` : `派 ${squadSize} 隻記憶靈到現場採集後解鎖`}</span>
        </div>
      </div>
      <div className="placeActions">
        <button className="primary" onClick={() => startNavigation(location.id)}>
          <Navigation size={16} />
          派隊
        </button>
        <button className="secondary" disabled={!visited} onClick={openCamera}>
          <Camera size={16} />
          3D 合照
        </button>
        <button className="ghost" onClick={() => onReport('地點錯誤資訊', location.name)}>
          <Flag size={16} />
          檢舉
        </button>
      </div>
      <div className="visitMeta">
        <span>距離約 {location.steps} 步</span>
        <span>{visit ? `最近 ${dateLabel(visit.date)}` : '完成採集認證後可互動'}</span>
      </div>
      <div className="notes">
        <div className="sectionTitle compact">
          <MessageSquareText size={18} />
          <h3>到訪筆記</h3>
        </div>
        {notes.map((note, index) => (
          <div className="note" key={`${note.user}-${index}`}>
            <strong>{note.user}</strong>
            <p>{note.text}</p>
            <div className="noteActions">
              <span><Star size={13} /> {note.helpful}</span>
              <button onClick={() => onReport('到訪筆記', `${location.name} · ${note.user}`)}>資訊過期</button>
              {note.user !== '你' && <button onClick={() => onBlock(note.user)}>封鎖</button>}
            </div>
          </div>
        ))}
      </div>
      <label className={`field ${!visited ? 'disabledField' : ''}`}>
        <span>一句話筆記</span>
        <textarea disabled={!visited} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder={visited ? '推薦什麼、適合什麼時間、是否需要排隊...' : '親自到訪後開放'} />
      </label>
      <button className="secondary wide" disabled={!visited || !noteText.trim()} onClick={saveNote}>
        <PenLine size={16} />
        發布筆記
      </button>
      <label className={`field ${!visited ? 'disabledField' : ''}`}>
        <span>回答旅人疑問</span>
        <input disabled={!visited} value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder={visited ? '例如：晚上會不會太暗？' : '親自到訪後開放'} />
      </label>
      <button className="ghost wide" disabled={!visited || !questionText.trim()} onClick={answerQuestion}>
        <Heart size={16} />
        採納後 +5 碎片
      </button>
    </aside>
  );
}

function MemoryCamera({ location, pet, pose, setPose, privacy, setPrivacy, scale, setScale, x, setX, y, setY, onClose, onSave }) {
  return (
    <div className="modalBackdrop">
      <div className="cameraModal">
        <div className="modalHead">
          <div>
            <span className="eyebrow">記憶相機</span>
            <h2>{location.name}</h2>
          </div>
          <button className="iconButton" onClick={onClose} aria-label="關閉">
            <X size={19} />
          </button>
        </div>
        <div className="photoStage" style={{ '--c1': location.palette[0], '--c2': location.palette[1], '--c3': location.palette[2] }}>
          <div className="photoScene">
            <div className="cloud c1" />
            <div className="cloud c2" />
            <div className="landmarkShape" />
            <div className="petSticker3d" style={{ left: `${x}%`, bottom: `${y}%`, transform: `scale(${scale})` }}>
              <Creature3D pet={pet} compact />
              <span>{pose}</span>
            </div>
          </div>
        </div>
        <div className="cameraControls">
          <div className="modeRow">
            {['站立', '揮手', '吃東西', '開心跳躍'].map((item) => (
              <button key={item} className={pose === item ? 'chip activeChip' : 'chip'} onClick={() => setPose(item)}>{item}</button>
            ))}
          </div>
          <div className="modeRow">
            {['公開', '僅好友', '私人記憶'].map((item) => (
              <button key={item} className={privacy === item ? 'chip activeChip' : 'chip'} onClick={() => setPrivacy(item)}>{item}</button>
            ))}
          </div>
          <div className="cameraSliders">
            <label>
              <span>位置 X</span>
              <input type="range" min="20" max="72" value={x} onChange={(event) => setX(Number(event.target.value))} />
            </label>
            <label>
              <span>位置 Y</span>
              <input type="range" min="4" max="34" value={y} onChange={(event) => setY(Number(event.target.value))} />
            </label>
            <label>
              <span>大小</span>
              <input type="range" min="0.7" max="1.45" step="0.05" value={scale} onChange={(event) => setScale(Number(event.target.value))} />
            </label>
          </div>
        </div>
        <button className="primary wide" onClick={onSave}>
          <Camera size={17} />
          儲存地點記憶卡
        </button>
      </div>
    </div>
  );
}

export default App;
