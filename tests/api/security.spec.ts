/**
 * Security / boundary / edge-case tests.
 * Verify the API handles extreme inputs gracefully and returns proper HTTP semantics.
 */
import { test, expect } from '../../src/fixtures';
import { ApiConstants } from '../../src/api/ApiConstants';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';

// ── Out-of-range & invalid IDs ─────────────────────────────────────────────

test.describe('Security: invalid IDs', { tag: ['@api', '@security'] }, () => {
  test('GET /posts with id=0 returns 404', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('id=0 boundary');
    await allureSeverity('normal');

    await allureStep('Assert 404 for GET /posts/0', async () => {
      const response = await postsApi.getById(0);
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });

  test('GET /posts with very large id returns 404', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('large id boundary');
    await allureSeverity('normal');

    await allureStep('Assert 404 for GET /posts/9999999', async () => {
      const response = await postsApi.getById(9999999);
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });

  test('GET /users with id=0 returns 404', async ({ usersApi }) => {
    await allureEpic('Security');
    await allureFeature('Users');
    await allureStory('id=0 boundary');
    await allureSeverity('normal');

    await allureStep('Assert 404 for GET /users/0', async () => {
      const response = await usersApi.getById(0);
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });

  test('GET /users with very large id returns 404', async ({ usersApi }) => {
    await allureEpic('Security');
    await allureFeature('Users');
    await allureStory('large id boundary');
    await allureSeverity('normal');

    await allureStep('Assert 404 for GET /users/9999999', async () => {
      const response = await usersApi.getById(9999999);
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });

  test('GET /comments with id=0 returns 404', async ({ commentsApi }) => {
    await allureEpic('Security');
    await allureFeature('Comments');
    await allureStory('id=0 boundary');
    await allureSeverity('normal');

    await allureStep('Assert 404 for GET /comments/0', async () => {
      const response = await commentsApi.getById(0);
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });

  test('GET /albums with id=0 returns 404', async ({ albumsApi }) => {
    await allureEpic('Security');
    await allureFeature('Albums');
    await allureStory('id=0 boundary');
    await allureSeverity('normal');

    await allureStep('Assert 404 for GET /albums/0', async () => {
      const response = await albumsApi.getById(0);
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });

  test('GET /albums with very large id returns 404', async ({ albumsApi }) => {
    await allureEpic('Security');
    await allureFeature('Albums');
    await allureStory('large id boundary');
    await allureSeverity('normal');

    await allureStep('Assert 404 for GET /albums/9999999', async () => {
      const response = await albumsApi.getById(9999999);
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });
});

// ── Response headers security ──────────────────────────────────────────────

test.describe('Security: response headers', { tag: ['@api', '@security'] }, () => {
  test('GET /posts response has Content-Type header', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('Content-Type present');
    await allureSeverity('normal');

    await allureStep('Assert Content-Type header is present', async () => {
      const response = await postsApi.getAll();
      expect(response.headers()).toHaveProperty('content-type');
    });
  });

  test('POST /posts response has Content-Type: application/json', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('POST response Content-Type');
    await allureSeverity('normal');

    await allureStep('Assert POST response Content-Type is JSON', async () => {
      const response = await postsApi.create({ userId: 1, title: 'Test', body: 'Test' });
      expect(response.headers()['content-type']).toContain('application/json');
    });
  });

  test('GET /users response has Content-Type header', async ({ usersApi }) => {
    await allureEpic('Security');
    await allureFeature('Users');
    await allureStory('Content-Type present');
    await allureSeverity('normal');

    await allureStep('Assert Content-Type header is present', async () => {
      const response = await usersApi.getAll();
      expect(response.headers()).toHaveProperty('content-type');
    });
  });

  test('GET /comments response has Content-Type header', async ({ commentsApi }) => {
    await allureEpic('Security');
    await allureFeature('Comments');
    await allureStory('Content-Type present');
    await allureSeverity('normal');

    await allureStep('Assert Content-Type header is present', async () => {
      const response = await commentsApi.getAll();
      expect(response.headers()).toHaveProperty('content-type');
    });
  });

  test('PUT /posts response has Content-Type: application/json', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('PUT response Content-Type');
    await allureSeverity('normal');

    await allureStep('Assert PUT response Content-Type is JSON', async () => {
      const response = await postsApi.update(1, { title: 'Updated' });
      expect(response.headers()['content-type']).toContain('application/json');
    });
  });

  test('DELETE /posts response has Content-Type header', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('DELETE response Content-Type');
    await allureSeverity('minor');

    await allureStep('Assert DELETE response Content-Type header exists', async () => {
      const response = await postsApi.remove(1);
      expect(response.headers()).toHaveProperty('content-type');
    });
  });
});

// ── Edge case payloads ──────────────────────────────────────────────────────

test.describe('Security: edge case payloads', { tag: ['@api', '@security'] }, () => {
  test('POST /posts with empty string title is accepted (status 201)', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('empty string title');
    await allureSeverity('normal');

    await allureStep('POST with empty title string — expect 201', async () => {
      const response = await postsApi.create({ userId: 1, title: '', body: 'body' });
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });

  test('POST /posts with very long title is accepted (status 201)', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('long title boundary');
    await allureSeverity('normal');

    await allureStep('POST with 1000-char title — expect 201', async () => {
      const longTitle = 'a'.repeat(1000);
      const response = await postsApi.create({ userId: 1, title: longTitle, body: 'body' });
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });

  test('POST /posts with special characters in title is accepted', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('special chars in title');
    await allureSeverity('normal');

    await allureStep('POST with HTML/special chars in title — expect 201', async () => {
      const specialTitle = '<script>alert("xss")</script> & "quotes" \'apostrophes\'';
      const response = await postsApi.create({ userId: 1, title: specialTitle, body: 'body' });
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });

  test('POST /posts special chars are returned verbatim (no server-side escaping)', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('special chars echo');
    await allureSeverity('normal');

    await allureStep('Verify returned title matches sent special chars', async () => {
      const specialTitle = 'Title with & and "quotes"';
      const response = await postsApi.create({ userId: 1, title: specialTitle, body: 'body' });
      const body = await response.json();
      expect(body.title).toBe(specialTitle);
    });
  });

  test('POST /posts with Unicode Hebrew text is accepted', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('Unicode / RTL text');
    await allureSeverity('normal');

    await allureStep('POST with Hebrew title — expect 201 and echo', async () => {
      const hebrewTitle = 'פוסט בדיקה מ-Organuz AI';
      const response = await postsApi.create({ userId: 1, title: hebrewTitle, body: 'גוף הפוסט' });
      expect(response.status()).toBe(ApiConstants.CREATED);
      const body = await response.json();
      expect(body.title).toBe(hebrewTitle);
    });
  });

  test('POST /users with minimal payload is accepted', async ({ usersApi }) => {
    await allureEpic('Security');
    await allureFeature('Users');
    await allureStory('minimal payload');
    await allureSeverity('normal');

    await allureStep('POST with only name, username, email — expect 201', async () => {
      const response = await usersApi.create({ name: 'Min User', username: 'minuser', email: 'min@test.com' });
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });

  test('POST /comments with SQL injection attempt in body is stored verbatim', async ({ commentsApi }) => {
    await allureEpic('Security');
    await allureFeature('Comments');
    await allureStory('SQL injection in body');
    await allureSeverity('normal');

    await allureStep('POST comment with SQL injection string — expect 201 and echo', async () => {
      const sqlBody = "'; DROP TABLE comments; --";
      const response = await commentsApi.create({ postId: 1, name: 'Tester', email: 'test@test.com', body: sqlBody });
      expect(response.status()).toBe(ApiConstants.CREATED);
      const body = await response.json();
      expect(body.body).toBe(sqlBody);
    });
  });

  test('POST /albums with empty title is accepted', async ({ albumsApi }) => {
    await allureEpic('Security');
    await allureFeature('Albums');
    await allureStory('empty string title');
    await allureSeverity('normal');

    await allureStep('POST with empty title string — expect 201', async () => {
      const response = await albumsApi.create({ userId: 1, title: '' });
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });
});

// ── HTTP method semantics ──────────────────────────────────────────────────

test.describe('Security: HTTP method semantics', { tag: ['@api', '@security'] }, () => {
  test('PUT /posts/{id} preserves the id field as sent', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('PUT id preservation');
    await allureSeverity('normal');

    await allureStep('Verify PUT response id matches the sent id field', async () => {
      const response = await postsApi.update(1, { userId: 1, title: 'T', body: 'B' });
      const body = await response.json();
      expect(body.id).toBe(1);
    });
  });

  test('PUT /users/{id} returns status 200', async ({ usersApi }) => {
    await allureEpic('Security');
    await allureFeature('Users');
    await allureStory('PUT returns 200');
    await allureSeverity('normal');

    await allureStep('Verify PUT /users/1 returns 200', async () => {
      const response = await usersApi.update(1, { name: 'Security Test' });
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });

  test('PUT /comments/{id} returns status 200', async ({ commentsApi }) => {
    await allureEpic('Security');
    await allureFeature('Comments');
    await allureStory('PUT returns 200');
    await allureSeverity('normal');

    await allureStep('Verify PUT /comments/1 returns 200', async () => {
      const response = await commentsApi.update(1, { body: 'Updated comment' });
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });

  test('PUT /albums/{id} returns status 200', async ({ albumsApi }) => {
    await allureEpic('Security');
    await allureFeature('Albums');
    await allureStory('PUT returns 200');
    await allureSeverity('normal');

    await allureStep('Verify PUT /albums/1 returns 200', async () => {
      const response = await albumsApi.update(1, { title: 'Security Test Album' });
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });

  test('DELETE /comments/{id} returns status 200', async ({ commentsApi }) => {
    await allureEpic('Security');
    await allureFeature('Comments');
    await allureStory('DELETE returns 200');
    await allureSeverity('normal');

    await allureStep('Verify DELETE /comments/1 returns 200', async () => {
      const response = await commentsApi.remove(1);
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });

  test('DELETE /albums/{id} returns status 200', async ({ albumsApi }) => {
    await allureEpic('Security');
    await allureFeature('Albums');
    await allureStory('DELETE /albums returns 200');
    await allureSeverity('normal');

    await allureStep('Verify DELETE /albums/1 returns 200', async () => {
      const response = await albumsApi.remove(1);
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });
});

// ── Timeout & retry resilience ─────────────────────────────────────────────

test.describe('Security: timeout & retry configuration', { tag: ['@api', '@security'] }, () => {
  test('GET /posts succeeds within default timeout', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Resilience');
    await allureStory('within timeout');
    await allureSeverity('normal');

    await allureStep('Verify GET /posts completes before 15000ms timeout', async () => {
      const start = Date.now();
      const response = await postsApi.getAll({ timeout: 15000 });
      const elapsed = Date.now() - start;
      expect(response.status()).toBe(ApiConstants.OK);
      expect(elapsed).toBeLessThan(15000);
    });
  });

  test('GET /users succeeds within default timeout', async ({ usersApi }) => {
    await allureEpic('Security');
    await allureFeature('Resilience');
    await allureStory('within timeout');
    await allureSeverity('normal');

    await allureStep('Verify GET /users completes before 15000ms', async () => {
      const start = Date.now();
      const response = await usersApi.getAll({ timeout: 15000 });
      const elapsed = Date.now() - start;
      expect(response.status()).toBe(ApiConstants.OK);
      expect(elapsed).toBeLessThan(15000);
    });
  });

  test('GET /posts responds faster than 10 seconds (performance baseline)', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Resilience');
    await allureStory('response time baseline');
    await allureSeverity('minor');

    await allureStep('Verify GET /posts latency < 10s', async () => {
      const start = Date.now();
      await postsApi.getAll();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10000);
    });
  });

  test('GET /users responds faster than 10 seconds (performance baseline)', async ({ usersApi }) => {
    await allureEpic('Security');
    await allureFeature('Resilience');
    await allureStory('users response time baseline');
    await allureSeverity('minor');

    await allureStep('Verify GET /users latency < 10s', async () => {
      const start = Date.now();
      await usersApi.getAll();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10000);
    });
  });

  test('consecutive GET /posts calls return consistent 200', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Resilience');
    await allureStory('idempotency');
    await allureSeverity('normal');

    await allureStep('Send GET /posts 3 times and verify all return 200', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await postsApi.getAll();
        expect(response.status()).toBe(ApiConstants.OK);
      }
    });
  });

  test('GET /posts with retries=0 still succeeds on healthy endpoint', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Resilience');
    await allureStory('retries=0');
    await allureSeverity('minor');

    await allureStep('GET /posts with retries=0 and verify 200', async () => {
      const response = await postsApi.getAll({ retries: 0 });
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });
});

// ── Cross-resource isolation ───────────────────────────────────────────────

test.describe('Security: cross-resource isolation', { tag: ['@api', '@security'] }, () => {
  test('GET /posts/1 does not leak data from /posts/2', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Data Isolation');
    await allureStory('no data leakage between resources');
    await allureSeverity('normal');

    await allureStep('Verify /posts/1 and /posts/2 have different ids', async () => {
      const [r1, r2] = await Promise.all([postsApi.getByIdAs(1), postsApi.getByIdAs(2)]);
      expect(r1.body.id).toBe(1);
      expect(r2.body.id).toBe(2);
      expect(r1.body.id).not.toBe(r2.body.id);
    });
  });

  test('GET /users/1 and GET /users/2 return different users', async ({ usersApi }) => {
    await allureEpic('Security');
    await allureFeature('Data Isolation');
    await allureStory('users are isolated');
    await allureSeverity('normal');

    await allureStep('Verify user 1 and user 2 have different ids and names', async () => {
      const [r1, r2] = await Promise.all([usersApi.getByIdAs(1), usersApi.getByIdAs(2)]);
      expect(r1.body.id).toBe(1);
      expect(r2.body.id).toBe(2);
      expect(r1.body.name).not.toBe(r2.body.name);
    });
  });

  test('DELETE /posts/1 response does not expose other posts data', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Data Isolation');
    await allureStory('DELETE response is empty');
    await allureSeverity('normal');

    await allureStep('Verify DELETE response is empty and does not expose IDs', async () => {
      const response = await postsApi.remove(1);
      const body = await response.json();
      expect(Object.keys(body).length).toBe(0);
    });
  });
});

// ── Input boundary: numeric edge cases ─────────────────────────────────────

test.describe('Security: numeric boundaries', { tag: ['@api', '@security'] }, () => {
  test('POST /posts with userId=0 is accepted', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('userId=0');
    await allureSeverity('minor');

    await allureStep('POST with userId=0 — JSONPlaceholder should accept it (201)', async () => {
      const response = await postsApi.create({ userId: 0, title: 'Boundary Test', body: 'body' });
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });

  test('POST /posts with very large userId is accepted', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('large userId');
    await allureSeverity('minor');

    await allureStep('POST with userId=999999 — expect 201', async () => {
      const response = await postsApi.create({ userId: 999999, title: 'Large userId test', body: 'body' });
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });

  test('GET /comments with postId=0 filter returns empty or 200', async ({ commentsApi }) => {
    await allureEpic('Security');
    await allureFeature('Comments');
    await allureStory('postId=0 filter');
    await allureSeverity('minor');

    await allureStep('GET /comments?postId=0 returns 200 (empty array)', async () => {
      const response = await commentsApi.getByPostId(0);
      expect(response.status()).toBe(ApiConstants.OK);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  test('PUT /posts/{id} with empty payload still returns 200', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('empty update payload');
    await allureSeverity('minor');

    await allureStep('PUT /posts/1 with empty object — expect 200', async () => {
      const response = await postsApi.update(1, {});
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });
});

// ── Response body safety ───────────────────────────────────────────────────

test.describe('Security: response body safety', { tag: ['@api', '@security'] }, () => {
  test('GET /posts response body is valid JSON (parseable)', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('valid JSON response');
    await allureSeverity('critical');

    await allureStep('Parse GET /posts response as JSON without errors', async () => {
      const response = await postsApi.getAll();
      const text = await response.text();
      expect(() => JSON.parse(text)).not.toThrow();
    });
  });

  test('GET /users response body is valid JSON', async ({ usersApi }) => {
    await allureEpic('Security');
    await allureFeature('Users');
    await allureStory('valid JSON response');
    await allureSeverity('critical');

    await allureStep('Parse GET /users response as JSON without errors', async () => {
      const response = await usersApi.getAll();
      const text = await response.text();
      expect(() => JSON.parse(text)).not.toThrow();
    });
  });

  test('GET /comments response body is valid JSON', async ({ commentsApi }) => {
    await allureEpic('Security');
    await allureFeature('Comments');
    await allureStory('valid JSON response');
    await allureSeverity('critical');

    await allureStep('Parse GET /comments response as JSON without errors', async () => {
      const response = await commentsApi.getAll();
      const text = await response.text();
      expect(() => JSON.parse(text)).not.toThrow();
    });
  });

  test('GET /albums response body is valid JSON', async ({ albumsApi }) => {
    await allureEpic('Security');
    await allureFeature('Albums');
    await allureStory('valid JSON response');
    await allureSeverity('critical');

    await allureStep('Parse GET /albums response as JSON without errors', async () => {
      const response = await albumsApi.getAll();
      const text = await response.text();
      expect(() => JSON.parse(text)).not.toThrow();
    });
  });

  test('POST /posts with emoji in title is echoed back correctly', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('emoji in title');
    await allureSeverity('minor');

    await allureStep('POST with emoji title — verify echo', async () => {
      const emojiTitle = '☀️ Solar Test 🌱';
      const response = await postsApi.create({ userId: 1, title: emojiTitle, body: 'body' });
      const body = await response.json();
      expect(body.title).toBe(emojiTitle);
    });
  });

  test('GET /posts response is an array (not an object)', async ({ postsApi }) => {
    await allureEpic('Security');
    await allureFeature('Posts');
    await allureStory('response is array not object');
    await allureSeverity('normal');

    await allureStep('Verify response top-level is an Array', async () => {
      const response = await postsApi.getAll();
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  test('GET /users response is an array (not an object)', async ({ usersApi }) => {
    await allureEpic('Security');
    await allureFeature('Users');
    await allureStory('response is array not object');
    await allureSeverity('normal');

    await allureStep('Verify response top-level is an Array', async () => {
      const response = await usersApi.getAll();
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  test('POST /comments with very long body is accepted', async ({ commentsApi }) => {
    await allureEpic('Security');
    await allureFeature('Comments');
    await allureStory('long body boundary');
    await allureSeverity('minor');

    await allureStep('POST with 2000-char body — expect 201', async () => {
      const longBody = 'x'.repeat(2000);
      const response = await commentsApi.create({ postId: 1, name: 'Long', email: 'l@t.com', body: longBody });
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });

  test('GET /albums/1/photos response is an array', async ({ albumsApi }) => {
    await allureEpic('Security');
    await allureFeature('Albums');
    await allureStory('photos response is array');
    await allureSeverity('normal');

    await allureStep('Verify /albums/1/photos returns an array', async () => {
      const response = await albumsApi.getPhotos(1);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  test('DELETE /albums/{id} response body is valid JSON', async ({ albumsApi }) => {
    await allureEpic('Security');
    await allureFeature('Albums');
    await allureStory('DELETE response is JSON');
    await allureSeverity('minor');

    await allureStep('Parse DELETE /albums/5 response as JSON', async () => {
      const response = await albumsApi.remove(5);
      const text = await response.text();
      expect(() => JSON.parse(text)).not.toThrow();
    });
  });
});
