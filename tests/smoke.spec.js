import { expect, test } from '@playwright/test';

test('html-first mobile app opens map list, detail sheet, pet and collection tabs', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await expect(page.locator('.phone')).toBeVisible();
  await expect(page.locator('#screen-map')).toHaveClass(/active/);
  await expect(page.locator('#locList .loc-card').first()).toBeVisible();

  await page.locator('#locList .loc-card').first().click();
  await expect(page.locator('.sheet.open')).toBeVisible();
  await expect(page.locator('.sheet h2')).toBeVisible();
  await page.locator('.close-x').click();

  await page.locator('.navbtn[data-tab="pet"]').click();
  await expect(page.locator('#screen-pet')).toHaveClass(/active/);
  await expect(page.locator('#petHolder svg')).toBeVisible();
  await expect(page.locator('#screen-pet')).not.toContainText('啟用真實步數');
  await expect(page.locator('#stepStatus')).toContainText('真實步數');

  await page.locator('.navbtn[data-tab="book"]').click();
  await expect(page.locator('#screen-book')).toHaveClass(/active/);
  await expect(page.locator('#galGrid .gcard').first()).toBeVisible();
});

test('pet starts as a named egg and hatches through tasks', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="pet"]').click();

  await expect(page.locator('#petName')).toHaveText('小芽蛋');
  await expect(page.locator('#petLevel')).toHaveText('孵化中');
  await expect(page.locator('#hatchBarLabel')).toHaveText('0 / 100');
  await expect(page.locator('#hatchHint')).toContainText('完成照片任務');

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('幫寵物蛋取名');
    await dialog.accept('阿蛋');
  });
  await page.locator('#petNameEdit').click();
  await expect(page.locator('#petName')).toHaveText('阿蛋');

  const hatch = await page.evaluate(() => {
    awardHatchPoints(15, '首次到訪');
    return {
      points: state.hatchPoints,
      hatched: state.hatched,
      stored: JSON.parse(localStorage.getItem('footprintPetLog:v1')),
    };
  });

  expect(hatch.points).toBe(15);
  expect(hatch.hatched).toBe(false);
  expect(hatch.stored.eggName).toBe('阿蛋');
  expect(hatch.stored.hatchPoints).toBe(15);
  await expect(page.locator('#hatchBarLabel')).toHaveText('15 / 100');
});

test('map category chips keep the tapped category active after real places load', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.evaluate(() => {
    window.loadNearbyPlaces = async (layer) => ({
      provider: 'google',
      places: [
        {
          id: `mock-${layer}`,
          name: '測試咖啡店',
          latitude: 24.1815,
          longitude: 120.6449,
          category: 'cafe',
          types: ['cafe', 'food', 'point_of_interest'],
          address: '台中市測試路 1 號',
          source: 'google',
        },
      ],
    });
  });

  await page.getByText('咖啡', { exact: true }).click();
  await expect(page.locator('#filterRow .chip.active')).toHaveText('咖啡');
  await expect(page.locator('#locList')).toContainText('測試咖啡店');
  await expect(page.locator('#filterRow .chip').filter({ hasText: '全部' })).not.toHaveClass(/active/);
});

test('map category changes keep the list scroll position visible', async ({ page }) => {
  await page.goto('http://localhost:5173');
  const result = await page.evaluate(async () => {
    const screen = document.getElementById('screen-map');
    const cases = [
      ['cafe', '咖啡', 'cafe'],
      ['dessert', '甜點', 'bakery'],
      ['park', '公園', 'park'],
      ['scenic', '景點', 'tourist_attraction'],
      ['convenience', '便利商店', 'convenience_store'],
      ['supermarket', '超市', 'supermarket'],
    ];
    window.renderMapMarkers = () => {
      screen.scrollTop = 0;
    };
    const results = [];
    for(const [filter, label, category] of cases){
      window.loadNearbyPlaces = async () => ({
        provider: 'google',
        places: [
          {
            id: `mock-${filter}`,
            name: `測試${label}`,
            latitude: 24.1815,
            longitude: 120.6449,
            category,
            types: [category, 'food', 'point_of_interest'],
            address: '台中市測試路 1 號',
            source: 'google',
          },
        ],
      });
      screen.scrollTop = 260;
      const desired = Math.max(screen.scrollTop, document.getElementById('filterRow').offsetTop - 8);
      setFilter(filter);
      await new Promise((resolve) => setTimeout(resolve, 180));
      results.push({
        filter,
        label,
        desired,
        after: screen.scrollTop,
        maxScroll: Math.max(0, screen.scrollHeight - screen.clientHeight),
        active: document.querySelector('#filterRow .chip.active')?.textContent,
        listText: document.getElementById('locList').textContent,
      });
    }
    return results;
  });

  for(const item of result){
    expect(item.active).toBe(item.label);
    expect(item.listText).toContain(`測試${item.label}`);
    expect(item.after).toBeGreaterThanOrEqual(Math.min(item.desired, item.maxScroll) - 1);
  }
});

test('pet hatches into one of five 3-stage rotatable 3D species and item generation is removed', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="me"]').click();
  await expect(page.locator('.gen-btn')).toHaveCount(0);
  await expect(page.getByTestId('pet-upload-input')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('碎片');

  const speciesMeta = await page.evaluate(() => ({
    speciesCount: PET_SPECIES.length,
    formCounts: PET_SPECIES.map((species) => species.forms.length),
  }));
  expect(speciesMeta.speciesCount).toBe(5);
  expect(speciesMeta.formCounts).toEqual([3, 3, 3, 3, 3]);

  const hatchResult = await page.evaluate(() => {
    state.hatchPoints = 95;
    awardHatchPoints(5, 'test');
    return {
      hatched: state.hatched,
      stage: state.petEvolutionStage,
      species: state.petSpecies,
    };
  });
  expect(hatchResult.hatched).toBe(true);
  expect(hatchResult.stage).toBe(1);
  expect(hatchResult.species).toBeTruthy();

  await page.locator('.navbtn[data-tab="pet"]').click();
  await expect(page.locator('#screen-pet')).toHaveClass(/active/);
  await expect(page.getByTestId('pet-3d-model')).toBeVisible();
  await expect(page.locator('#petLevel')).not.toHaveText('孵化中');
  await expect(page.locator('#evoSummary .evo-chip')).toHaveCount(3);
  const before = await page.getByTestId('pet-3d-model').evaluate((el) => getComputedStyle(el).getPropertyValue('--pet-rot-y'));
  await page.getByTestId('pet-3d-model').dragTo(page.getByTestId('pet-3d-model'), {
    sourcePosition: { x: 38, y: 38 },
    targetPosition: { x: 118, y: 38 },
  });
  const after = await page.getByTestId('pet-3d-model').evaluate((el) => getComputedStyle(el).getPropertyValue('--pet-rot-y'));
  expect(after).not.toBe(before);

  const evoResult = await page.evaluate(() => {
    state.petXp = 170;
    updateLevels();
    renderPet();
    const beforeClass = document.querySelector('[data-testid="pet-3d-model"]').className;
    awardPetGrowth(15, 'test');
    const midClass = document.querySelector('[data-testid="pet-3d-model"]').className;
    awardPetGrowth(340, 'test');
    const finalClass = document.querySelector('[data-testid="pet-3d-model"]').className;
    return {
      stage: state.petEvolutionStage,
      beforeClass,
      midClass,
      finalClass,
      label: document.getElementById('petLevel').textContent,
    };
  });
  expect(evoResult.beforeClass).toContain('evo-1');
  expect(evoResult.midClass).toContain('evo-2');
  expect(evoResult.finalClass).toContain('evo-3');
  expect(evoResult.stage).toBe(3);
  expect(evoResult.label).toContain('完全體');
});

test('step counter starts from real daily steps and ignores demo rewards', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.locator('#topStep')).toHaveText('0');

  const result = await page.evaluate(() => {
    setTodaySteps(12, 'test');
    const beforeMemory = state.steps;
    saveMemory('frini');
    stepTracker.lastMagnitude = 9.8;
    stepTracker.lastStepAt = Date.now() - 400;
    handleMotionStep({ accelerationIncludingGravity: { x: 8, y: 0, z: 9.8 } });
    return {
      beforeMemory,
      afterMemory: beforeMemory === 12 ? state.steps - 1 : state.steps,
      finalSteps: state.steps,
      stored: JSON.parse(localStorage.getItem('footprintStepLogs:v1')),
    };
  });

  expect(result.beforeMemory).toBe(12);
  expect(result.afterMemory).toBe(12);
  expect(result.finalSteps).toBe(13);
  const today = new Date().toLocaleDateString('sv-SE');
  expect(result.stored[today].steps).toBe(13);
  await expect(page.locator('#topStep')).toHaveText('13');
});

test('nearby places falls back to client Google Places for GitHub Pages', async ({ page }) => {
  await page.route('**/api/nearby-places**', (route) => {
    route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
  });
  await page.goto('http://localhost:5173');
  const result = await page.evaluate(async () => {
    map = {};
    window.google = {
      maps: {
        LatLng: function LatLng(lat, lng) {
          return { lat, lng };
        },
        places: {
          PlacesServiceStatus: {
            OK: 'OK',
            ZERO_RESULTS: 'ZERO_RESULTS',
          },
          PlacesService: function PlacesService() {
            return {
              nearbySearch(_request, callback) {
                callback([
                  {
                    place_id: 'mock-place-1',
                    name: 'Mock Coffee',
                    vicinity: 'Mock Road 1',
                    geometry: {
                      location: {
                        lat: () => 24.18,
                        lng: () => 120.64,
                      },
                    },
                    types: ['cafe'],
                  },
                ], 'OK');
              },
            };
          },
        },
      },
    };
    return loadNearbyPlaces('cafe');
  });

  expect(result.provider).toBe('google');
  expect(result.places[0].name).toBe('Mock Coffee');
  expect(result.places[0].latitude).toBe(24.18);
});

test('blind quest planner starts hidden route and validates a city photo', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await expect(page.locator('#questCard')).toContainText('空堂盲盒探索');
  await page.locator('#questTime').selectOption('40 分鐘');
  await page.locator('#questTheme').selectOption('城市色彩');
  await page.getByRole('button', { name: '開始盲盒路線' }).click();

  await expect(page.locator('#questCard')).toContainText('盲盒路線進行中');
  await expect(page.locator('#questCard')).toContainText('方向');
  await expect(page.locator('#questCard')).toContainText('距離');
  await expect(page.locator('#questCard')).toContainText('抵達判定');
  await expect(page.locator('#questCard')).toContainText('步行約');
  await expect(page.locator('#questCard')).toContainText('上傳任務照片驗證');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <rect width="120" height="120" fill="#1b7f5a"/>
      <rect x="8" y="8" width="44" height="44" fill="#ffc93c"/>
      <rect x="64" y="12" width="44" height="92" fill="#ff6b5b"/>
      <path d="M0 110 L120 10" stroke="#1c2541" stroke-width="12"/>
      <circle cx="36" cy="84" r="18" fill="#eaf6ff"/>
    </svg>`;
  await page.locator('#questPhotoInput').setInputFiles({
    name: 'city-detail.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svg),
  });

  await expect(page.locator('#questCard')).toContainText('照片任務通過');
  await expect(page.locator('#questCard')).toContainText('解鎖下一段線索');
});

test('blind quest can be completed and creates weekly review', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await page.getByRole('button', { name: '開始盲盒路線' }).click();
  await page.getByRole('button', { name: '安全略過' }).click();
  await page.getByRole('button', { name: '解鎖下一段線索' }).click();
  await page.getByRole('button', { name: '安全略過' }).click();
  await page.getByRole('button', { name: '解鎖下一段線索' }).click();
  await page.getByRole('button', { name: '安全略過' }).click();
  await page.getByRole('button', { name: '完成並生成回顧' }).click();

  await expect(page.locator('#questCard')).toContainText('本次旅程已完成');
  await page.locator('.navbtn[data-tab="me"]').click();
  await expect(page.locator('#reviewList')).toContainText('本週城市回顧');
  await expect(page.locator('#reviewList')).toContainText('任務');
});

test('online tab renders safe offline state before Firebase is configured', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();

  await expect(page.locator('#screen-online')).toHaveClass(/active/);
  await expect(page.locator('#onlineStatus')).toContainText('Firebase');
  await expect(page.locator('#authContent')).toContainText('Firebase');
  await expect(page.locator('#friendCodeBox')).toContainText('----');
  await expect(page.locator('#friendList')).toContainText('登入後');

  await page.locator('#shareLocationBtn').click();
  await expect(page.locator('#toast')).toContainText('請先登入');
});

test('quick login prompts for a display name when Firebase is configured', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();
  await page.evaluate(() => {
    window.FOOTPRINT_FIREBASE_CONFIG = {
      apiKey: 'test-key',
      authDomain: 'test.firebaseapp.com',
      databaseURL: 'https://test.firebaseio.com',
      projectId: 'test',
      appId: 'test-app',
    };
    window.quickLoginName = '';
    window.FootprintOnline = {
      quickSignIn(displayName) {
        window.quickLoginName = displayName;
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-out',
      user: null,
      friendCode: '',
      friends: [],
      party: null,
      partyInvites: [],
      sharing: false,
    });
  });
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('輸入使用者名稱');
    await dialog.accept('阿曼');
  });
  await page.getByRole('button', { name: '快速登入' }).click();
  await expect.poll(() => page.evaluate(() => window.quickLoginName)).toBe('阿曼');
});

test('online tab switches to signed-in UI when auth snapshot arrives', async ({ page }) => {
  await page.context().grantPermissions(['geolocation'], { origin: 'http://localhost:5173' });
  await page.context().setGeolocation({ latitude: 24.1815, longitude: 120.6449 });
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();
  await page.evaluate(() => {
    window.FootprintOnline = {
      updateLocation(payload, targetUids) {
        window.locationShareTargets = targetUids;
        window.receiveOnlineSnapshot({
          sharing: true,
          shareTargetUids: targetUids,
          myLocation: {
            lat: payload.lat,
            lng: payload.lng,
            updatedAt: payload.updatedAt,
          },
          lastSharedAt: payload.updatedAt,
        });
      },
      stopSharing() {},
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'test-user',
        displayName: '測試玩家',
        email: 'test@example.com',
      },
      friendCode: 'ABC12345',
      friends: [
        { uid: 'friend-a', displayName: 'Friend A' },
        { uid: 'friend-b', displayName: 'Friend B' },
      ],
      party: null,
      partyInvites: [],
      sharing: false,
      shareTargetUids: [],
    });
  });

  await expect(page.locator('#authContent')).toContainText('測試玩家');
  await expect(page.locator('#authContent')).not.toContainText('使用 Google 登入');
  await expect(page.locator('#friendCodeBox')).toContainText('ABC12345');
  await expect(page.locator('#shareTargetPicker input')).toHaveCount(2);
  await page.locator('#shareTargetPicker input').nth(0).check();

  await page.locator('#shareLocationBtn').click();
  await expect.poll(() => page.evaluate(() => window.locationShareTargets)).toEqual(['friend-a']);
  await expect(page.locator('#sharingText')).toContainText('分享中');
});

test('notification launch opens online tab and preselects share-back friend', async ({ page }) => {
  await page.goto('http://localhost:5173/?tab=online&action=shareBack&friend=friend-a');
  await page.evaluate(() => {
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'test-user',
        displayName: 'Me',
        email: 'test@example.com',
      },
      friendCode: 'ABC12345',
      friends: [
        { uid: 'friend-a', displayName: 'Friend A' },
        { uid: 'friend-b', displayName: 'Friend B' },
      ],
      party: null,
      partyInvites: [],
      sharing: false,
      shareTargetUids: [],
      push: {
        supported: true,
        configured: true,
        permission: 'default',
        enabled: false,
      },
    });
  });

  await expect(page.locator('#screen-online')).toHaveClass(/active/);
  await expect(page.locator('#shareTargetPicker input').nth(0)).toBeChecked();
  await expect(page.locator('#shareTargetPicker input').nth(1)).not.toBeChecked();
  await expect(page.locator('#authContent')).not.toContainText('開啟通知');
  await expect(page.locator('#authContent')).not.toContainText('通知設定');
});

test('profile tab prompts before login and lets signed-in users change display name', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="me"]').click();

  await expect(page.locator('#profileName')).toHaveText('請先登入');
  await expect(page.locator('#profileMeta')).toContainText('登入後');
  await expect(page.locator('#profileEdit')).toContainText('前往登入');

  await page.evaluate(() => {
    window.FootprintOnline = {
      updateDisplayName(displayName) {
        window.receiveOnlineSnapshot({
          user: {
            uid: 'test-user',
            displayName,
            email: 'test@example.com',
          },
        });
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'test-user',
        displayName: '城市玩家',
        email: 'test@example.com',
      },
      friendCode: 'ABC12345',
      friends: [],
      party: null,
      partyInvites: [],
      sharing: false,
    });
  });

  await expect(page.locator('#profileName')).toHaveText('城市玩家');
  await page.locator('#profileNameInput').fill('阿曼');
  await page.getByRole('button', { name: '儲存使用者名稱' }).click();
  await expect(page.locator('#profileName')).toHaveText('阿曼');
});

test('profile avatar can be uploaded and rendered as a photo', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="me"]').click();
  await page.evaluate(() => {
    window.avatarSaved = '';
    window.FootprintOnline = {
      updateAvatar(photoURL) {
        window.avatarSaved = photoURL;
        window.receiveOnlineSnapshot({
          user: {
            uid: 'test-user',
            displayName: '城市玩家',
            email: 'test@example.com',
            photoURL,
          },
        });
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'test-user',
        displayName: '城市玩家',
        email: 'test@example.com',
        photoURL: '',
      },
      friendCode: 'ABC12345',
      friends: [],
      party: null,
      partyInvites: [],
      sharing: false,
    });
  });

  await page.locator('#profileAvatarInput').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGUlEQVR42mP8z8Dwn4GBgYGJgYGB4T8ABWwCAu7RlVwAAAAASUVORK5CYII=',
      'base64',
    ),
  });

  await expect(page.locator('#profileAvatar img')).toBeVisible();
  await expect(page.locator('#profileAvatar')).toHaveCSS('border-radius', '50%');
  const saved = await page.evaluate(() => window.avatarSaved);
  expect(saved).toMatch(/^data:image\/(webp|jpeg|png);base64,/);
});

test('uploaded avatars render as round map markers', async ({ page }) => {
  await page.goto('http://localhost:5173');
  const result = await page.evaluate(() => {
    window.createdMarkers = [];
    const photoURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGUlEQVR42mP8z8Dwn4GBgYGJgYGB4T8ABWwCAu7RlVwAAAAASUVORK5CYII=';
    map = {};
    window.google = {
      maps: {
        SymbolPath: { CIRCLE: 'circle' },
        Size: class Size {
          constructor(width, height) {
            this.width = width;
            this.height = height;
          }
        },
        Point: class Point {
          constructor(x, y) {
            this.x = x;
            this.y = y;
          }
        },
        Marker: class Marker {
          constructor(options) {
            this.options = options;
            window.createdMarkers.push(this);
          }
          setMap() {}
          addListener() {}
        },
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: { uid: 'me', displayName: '城市玩家', email: 'me@example.com', photoURL },
      friendCode: 'ABC12345',
      sharing: true,
      shareTargetUids: ['friend-1'],
      myLocation: { lat: 24.1815, lng: 120.6449, updatedAt: Date.now() },
      friends: [
        {
          uid: 'friend-1',
          displayName: '好友J',
          photoURL,
          location: { lat: 35.6812, lng: 139.7671, accuracy: 32, updatedAt: Date.now() },
        },
      ],
      party: null,
      partyInvites: [],
    });
    const friendMarker = window.createdMarkers.find((marker) => marker.options.title === '好友J');
    const userMarker = window.createdMarkers.find((marker) => marker.options.title === '城市玩家');
    return {
      friendIconUrl: friendMarker?.options.icon?.url || '',
      friendHasLabel: Boolean(friendMarker?.options.label),
      userIconUrl: userMarker?.options.icon?.url || '',
      userSize: userMarker?.options.icon?.scaledSize,
    };
  });

  expect(result.friendIconUrl).toContain('data:image/svg+xml');
  expect(result.friendHasLabel).toBe(false);
  expect(result.userIconUrl).toContain('data:image/svg+xml');
  expect(result.userSize).toEqual({ width: 48, height: 48 });
});

test('friend code input is readable on mobile and party invite can be accepted', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();
  await page.evaluate(() => {
    window.joinedParty = '';
    window.FootprintOnline = {
      joinParty(partyId) {
        window.joinedParty = partyId;
        window.receiveOnlineSnapshot({
          partyInvites: [],
          party: {
            id: partyId,
            goal: '一起散步',
            members: {
              host: { displayName: '好友A' },
              me: { displayName: '城市玩家' },
            },
          },
        });
      },
      declineParty(partyId) {
        window.declinedParty = partyId;
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'test-user',
        displayName: '城市玩家',
        email: 'test@example.com',
      },
      friendCode: 'ABC12345',
      friends: [],
      party: null,
      partyInvites: [
        {
          partyId: 'party-1',
          hostName: '好友A',
          goal: '一起散步',
          createdAt: Date.now(),
        },
      ],
      sharing: false,
    });
  });

  const inputMetrics = await page.locator('#friendCodeInput').evaluate((input) => {
    const box = input.getBoundingClientRect();
    const style = window.getComputedStyle(input);
    return { width: box.width, fontSize: Number.parseFloat(style.fontSize) };
  });
  expect(inputMetrics.width).toBeGreaterThan(170);
  expect(inputMetrics.fontSize).toBeGreaterThanOrEqual(16);

  await expect(page.locator('#partyInvitesList')).toContainText('好友A 邀請你散步');
  await page.locator('#partyInvitesList button').filter({ hasText: '拒絕' }).click();
  await expect.poll(() => page.evaluate(() => window.declinedParty)).toBe('party-1');
  await page.locator('#partyInvitesList button').filter({ hasText: '加入' }).click();
  await expect(page.locator('#partyStatus')).toContainText('小隊進行中');
  await expect(page.locator('#partyStatus')).toContainText('城市玩家');
  await expect.poll(() => page.evaluate(() => window.joinedParty)).toBe('party-1');
});

test('friend distance only appears after both sides share locations', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();
  await page.evaluate(() => {
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'me',
        displayName: '城市玩家',
        email: 'me@example.com',
      },
      friendCode: 'ABC12345',
      friends: [
        {
          uid: 'friend-1',
          displayName: '好友A',
          location: {
            lat: 24.182,
            lng: 120.645,
            updatedAt: Date.now(),
          },
        },
      ],
      party: null,
      partyInvites: [],
      sharing: false,
      myLocation: null,
    });
  });

  await expect(page.locator('#friendList')).toContainText('待你分享');

  await page.evaluate(() => {
    window.receiveOnlineSnapshot({
      sharing: true,
      shareTargetUids: ['friend-1'],
      myLocation: {
        lat: 24.1815,
        lng: 120.6449,
        updatedAt: Date.now(),
      },
    });
  });

  await expect(page.locator('#friendList')).toContainText('57 m');
});

test('friend map info shows distance and approximate location details', async ({ page }) => {
  await page.goto('http://localhost:5173');
  const info = await page.evaluate(() => {
    window.infoWindowState = {};
    window.createdMarkers = [];
    map = {};
    window.google = {
      maps: {
        SymbolPath: { CIRCLE: 'circle' },
        Marker: class Marker {
          constructor(options) {
            this.options = options;
            this.listeners = {};
            window.createdMarkers.push(this);
          }
          setMap() {}
          addListener(name, callback) {
            this.listeners[name] = callback;
          }
        },
        InfoWindow: class InfoWindow {
          setContent(content) { window.infoWindowState.content = content; }
          setPosition(position) { window.infoWindowState.position = position; }
          open(options) { window.infoWindowState.openOptions = options; }
        },
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: { uid: 'me', displayName: '城市玩家', email: 'me@example.com' },
      friendCode: 'ABC12345',
      sharing: true,
      shareTargetUids: ['friend-1'],
      myLocation: { lat: 24.1815, lng: 120.6449, updatedAt: Date.now() },
      friends: [
        {
          uid: 'friend-1',
          displayName: '好友J',
          location: {
            lat: 35.6812,
            lng: 139.7671,
            accuracy: 32,
            updatedAt: Date.now(),
          },
        },
      ],
      party: null,
      partyInvites: [],
    });
    window.createdMarkers.find((marker) => marker.options.title === '好友J').listeners.click();
    return window.infoWindowState;
  });

  expect(info.content).toContain('好友J');
  expect(info.content).toContain('距離');
  expect(info.content).toContain('35.68120, 139.76710');
  expect(info.content).toContain('約 32 m 範圍');
  expect(info.content).toContain('google.com/maps/search');
  expect(info.openOptions.anchor).toBeTruthy();
});

test('walk party creation sends invites only to checked friends and does not overwrite an active party', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.navbtn[data-tab="online"]').click();
  await page.evaluate(() => {
    window.createdInvites = null;
    window.FootprintOnline = {
      createParty(inviteUids) {
        window.createdInvites = inviteUids;
      },
      inviteToParty(inviteUids) {
        window.addedInvites = inviteUids;
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: {
        uid: 'me',
        displayName: '城市玩家',
        email: 'me@example.com',
      },
      friendCode: 'ABC12345',
      friends: [
        { uid: 'friend-a', displayName: '好友A' },
        { uid: 'friend-b', displayName: '好友B' },
      ],
      party: null,
      partyInvites: [],
      sharing: false,
    });
  });

  await expect(page.locator('#partyInvitePicker')).toContainText('選擇要邀請的好友');
  await page.locator('#partyInvitePicker input').nth(1).uncheck();
  await page.getByRole('button', { name: '建立小隊' }).click();
  await expect.poll(() => page.evaluate(() => window.createdInvites)).toEqual(['friend-a']);

  await page.evaluate(() => {
    window.createdInvites = null;
    window.receiveOnlineSnapshot({
      party: {
        id: 'existing-party',
        hostUid: 'friend-a',
        goal: '一起散步',
        members: {
          'friend-a': { displayName: '好友A' },
          me: { displayName: '城市玩家' },
        },
      },
    });
  });

  await page.getByRole('button', { name: '邀請好友' }).click();
  await expect(page.locator('#toast')).toContainText('只有小隊建立人');
  await expect.poll(() => page.evaluate(() => window.createdInvites)).toBeNull();

  await page.evaluate(() => {
    window.receiveOnlineSnapshot({
      party: {
        id: 'existing-party',
        hostUid: 'me',
        goal: '一起散步',
        members: {
          me: { displayName: '城市玩家' },
          'friend-a': { displayName: '好友A' },
        },
      },
    });
  });
  await expect(page.locator('#partyInvitePicker')).toContainText('追加邀請好友');
  await page.locator('#partyInvitePicker input').first().check();
  await page.getByRole('button', { name: '邀請好友' }).click();
  await expect.poll(() => page.evaluate(() => window.addedInvites)).toEqual(['friend-b']);
});

test('map double click enters fullscreen and does not exit while zooming', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.locator('.map-expand-btn')).toBeVisible();
  await page.locator('.map-expand-btn').click();
  await expect(page.locator('#mapWrap')).toHaveClass(/map-fullscreen/);
  const fullscreenMetrics = await page.evaluate(() => {
    const wrap = document.getElementById('mapWrap').getBoundingClientRect();
    const exitZone = document.getElementById('mapExitZone').getBoundingClientRect();
    const exitStyle = getComputedStyle(document.querySelector('.map-exit-btn'));
    const friendsStyle = getComputedStyle(document.querySelector('.map-friends-btn'));
    const recenterStyle = getComputedStyle(document.querySelector('.map-recenter-btn'));
    const locateStyle = getComputedStyle(document.querySelector('.locate-btn'));
    return {
      heightRatio: wrap.height / window.innerHeight,
      exitZoneTop: exitZone.top,
      mapBottom: wrap.bottom,
      exitPosition: exitStyle.position,
      friendsPosition: friendsStyle.position,
      recenterPosition: recenterStyle.position,
      locatePosition: locateStyle.position,
      exitZ: Number(exitStyle.zIndex),
      friendsZ: Number(friendsStyle.zIndex),
      recenterZ: Number(recenterStyle.zIndex),
      locateZ: Number(locateStyle.zIndex),
      googleFullscreenVisible: [...document.querySelectorAll('.gm-fullscreen-control')].some((el) => getComputedStyle(el).display !== 'none'),
      googleCameraVisible: [...document.querySelectorAll('#map button[title="Map camera controls"], #map button[aria-label="Map camera controls"]')].some((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0),
    };
  });
  expect(fullscreenMetrics.heightRatio).toBeGreaterThanOrEqual(0.65);
  expect(fullscreenMetrics.exitZoneTop).toBeGreaterThanOrEqual(fullscreenMetrics.mapBottom - 2);
  expect(fullscreenMetrics.exitPosition).toBe('absolute');
  expect(fullscreenMetrics.friendsPosition).toBe('absolute');
  expect(fullscreenMetrics.recenterPosition).toBe('absolute');
  expect(fullscreenMetrics.locatePosition).toBe('absolute');
  expect(fullscreenMetrics.exitZ).toBeGreaterThanOrEqual(260);
  expect(fullscreenMetrics.friendsZ).toBeGreaterThanOrEqual(260);
  expect(fullscreenMetrics.recenterZ).toBeGreaterThanOrEqual(260);
  expect(fullscreenMetrics.locateZ).toBeGreaterThanOrEqual(260);
  expect(fullscreenMetrics.googleFullscreenVisible).toBe(false);
  expect(fullscreenMetrics.googleCameraVisible).toBe(false);
  await expect(page.locator('.map-exit-btn')).toBeVisible();
  await expect(page.locator('.map-friends-btn')).toBeVisible();
  await expect(page.locator('.map-recenter-btn')).toBeVisible();
  await expect(page.locator('.locate-btn')).toBeVisible();
  await page.locator('#mapWrap').dblclick();
  await expect(page.locator('#mapWrap')).toHaveClass(/map-fullscreen/);
  await page.locator('#mapWrap').click({ position: { x: 250, y: 250 } });
  await expect(page.locator('#mapWrap')).toHaveClass(/map-fullscreen/);
  await expect(page.locator('#mapExitZone')).toHaveClass(/active/);
  await page.locator('#mapExitZone').click();
  await expect(page.locator('#mapWrap')).not.toHaveClass(/map-fullscreen/);
  await page.locator('#mapWrap').dblclick();
  await expect(page.locator('#mapWrap')).toHaveClass(/map-fullscreen/);
  await page.locator('.map-exit-btn').click();
  await expect(page.locator('#mapWrap')).not.toHaveClass(/map-fullscreen/);
});

test('fullscreen map controls remain visible on second entry after scrolling', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.map-expand-btn').click();
  await expect(page.locator('#mapWrap')).toHaveClass(/map-fullscreen/);
  await page.locator('#mapExitZone').click();
  await expect(page.locator('#mapWrap')).not.toHaveClass(/map-fullscreen/);

  await page.evaluate(() => {
    document.getElementById('screen-map').scrollTop = 420;
    toggleMapFullscreen(true);
  });

  await expect(page.locator('#mapWrap')).toHaveClass(/map-fullscreen/);
  await expect(page.locator('.map-exit-btn')).toBeVisible();
  await expect(page.locator('.map-friends-btn')).toBeVisible();
  await expect(page.locator('.map-recenter-btn')).toBeVisible();
  await expect(page.locator('.locate-btn')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('screen-map').scrollTop)).toBe(0);
});

test('fullscreen map recenter button returns to known user location', async ({ page }) => {
  await page.goto('http://localhost:5173');
  const result = await page.evaluate(() => {
    window.zoomCalls = [];
    window.centerCalls = [];
    map = {
      setCenter(value) { window.centerCalls.push(value); },
      setZoom(value) { window.zoomCalls.push(value); },
    };
    window.google = {
      maps: {
        SymbolPath: { CIRCLE: 'circle' },
        Marker: class Marker {
          constructor(options) { this.options = options; }
          setMap() {}
          addListener() {}
        },
        event: { trigger() {}, addListenerOnce(_map, _name, callback) { callback(); } },
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      user: { uid: 'me', displayName: 'Me' },
      friends: [],
      myLocation: { lat: 25.033, lng: 121.5654, updatedAt: Date.now() },
    });
    toggleMapFullscreen(true);
    recenterFullscreenMap();
    return {
      lastCenter: window.centerCalls.at(-1),
      lastZoom: window.zoomCalls.at(-1),
      here: { lat: HERE.lat, lng: HERE.lng },
      fullscreen: document.getElementById('mapWrap').classList.contains('map-fullscreen'),
    };
  });

  expect(result.lastCenter).toEqual({ lat: 25.033, lng: 121.5654 });
  expect(result.lastZoom).toBe(15);
  expect(result.here).toEqual({ lat: 25.033, lng: 121.5654 });
  expect(result.fullscreen).toBe(true);
});

test('distant friend locations are included in map bounds', async ({ page }) => {
  await page.goto('http://localhost:5173');
  const fitResult = await page.evaluate(async () => {
    window.fitBoundsCalls = [];
    map = {
      fitBounds(bounds, padding) {
        window.fitBoundsCalls.push({ points: bounds.points, padding });
      },
      getZoom() { return 4; },
      setZoom(value) { window.lastZoom = value; },
      setCenter(value) { window.lastCenter = value; },
    };
    window.google = {
      maps: {
        SymbolPath: { CIRCLE: 'circle' },
        Marker: class Marker {
          constructor(options) { this.options = options; }
          setMap() {}
          addListener() {}
        },
        LatLngBounds: class LatLngBounds {
          constructor() { this.points = []; }
          extend(point) { this.points.push(point); }
        },
        event: {
          addListenerOnce(_map, _name, callback) { callback(); },
        },
      },
    };
    window.receiveOnlineSnapshot({
      configured: true,
      status: 'signed-in',
      user: { uid: 'me', displayName: '城市玩家', email: 'me@example.com' },
      friendCode: 'ABC12345',
      sharing: true,
      myLocation: { lat: 24.1815, lng: 120.6449, updatedAt: Date.now() },
      friends: [
        {
          uid: 'jp-friend',
          displayName: '日本好友',
          location: { lat: 35.6812, lng: 139.7671, updatedAt: Date.now() },
        },
      ],
      party: null,
      partyInvites: [],
    });
    fitFriendMapBounds();
    return window.fitBoundsCalls.at(-1);
  });

  expect(fitResult.points).toEqual([
    { lat: 24.1815, lng: 120.6449 },
    { lat: 35.6812, lng: 139.7671 },
  ]);
  expect(fitResult.padding).toBe(64);
});

test('locate me resets map zoom after distant friend bounds', async ({ page }) => {
  await page.goto('http://localhost:5173');
  const result = await page.evaluate(async () => {
    window.zoomCalls = [];
    window.centerCalls = [];
    map = {
      setCenter(value) { window.centerCalls.push(value); },
      setZoom(value) { window.zoomCalls.push(value); },
    };
    window.google = {
      maps: {
        SymbolPath: { CIRCLE: 'circle' },
        Marker: class Marker {
          constructor(options) { this.options = options; }
          setMap() {}
          addListener() {}
        },
        event: { trigger() {}, addListenerOnce(_map, _name, callback) { callback(); } },
      },
    };
    window.fetchNearbyRealPlaces = () => {};
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success) {
          success({ coords: { latitude: 24.2, longitude: 120.7, accuracy: 10 } });
        },
      },
    });
    await locateMe();
    return {
      lastZoom: window.zoomCalls.at(-1),
      lastCenter: window.centerCalls.at(-1),
    };
  });

  expect(result.lastZoom).toBe(15);
  expect(result.lastCenter).toEqual({ lat: 24.2, lng: 120.7 });
});

test('exiting fullscreen restores normal local map zoom', async ({ page }) => {
  await page.goto('http://localhost:5173');
  const result = await page.evaluate(async () => {
    window.zoomCalls = [];
    window.centerCalls = [];
    map = {
      setCenter(value) { window.centerCalls.push(value); },
      setZoom(value) { window.zoomCalls.push(value); },
    };
    window.google = {
      maps: {
        SymbolPath: { CIRCLE: 'circle' },
        Marker: class Marker {
          constructor(options) { this.options = options; }
          setMap() {}
          addListener() {}
        },
        event: { trigger() {}, addListenerOnce(_map, _name, callback) { callback(); } },
      },
    };
    toggleMapFullscreen(true);
    toggleMapFullscreen(false);
    await new Promise((resolve) => setTimeout(resolve, 140));
    return {
      lastZoom: window.zoomCalls.at(-1),
      lastCenter: window.centerCalls.at(-1),
    };
  });

  expect(result.lastZoom).toBe(14);
  expect(result.lastCenter).toEqual({ lat: 24.1815, lng: 120.6449 });
});
