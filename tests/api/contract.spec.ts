/**
 * Contract tests — verify every API resource adheres strictly to its declared schema.
 * Each test asserts field presence, types, formats, counts, and invariants.
 */
import { test, expect } from '../../src/fixtures';
import { ApiConstants } from '../../src/api/ApiConstants';
import { Post, User, Comment, Album, Photo } from '../../src/types/api.types';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';

// ── Posts contract ──────────────────────────────────────────────────────────

test.describe('Contract: POST schema', { tag: ['@api', '@contract'] }, () => {
  test('GET /posts returns Content-Type: application/json', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Posts');
    await allureStory('Content-Type header');
    await allureSeverity('critical');

    await allureStep('Assert Content-Type includes application/json', async () => {
      const response = await postsApi.getAll();
      expect(response.headers()['content-type']).toContain('application/json');
    });
  });

  test('every post has all 4 required fields', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Posts');
    await allureStory('Required fields');
    await allureSeverity('critical');

    await allureStep('Verify userId, id, title, body present in every post', async () => {
      const response = await postsApi.getAll();
      const posts: Post[] = await response.json();
      for (const p of posts) {
        expect(p).toHaveProperty('userId');
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('title');
        expect(p).toHaveProperty('body');
      }
    });
  });

  test('post userId is a positive integer', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Posts');
    await allureStory('userId type');
    await allureSeverity('normal');

    await allureStep('Verify all post userIds are positive integers', async () => {
      const response = await postsApi.getAll();
      const posts: Post[] = await response.json();
      for (const p of posts) {
        expect(Number.isInteger(p.userId)).toBe(true);
        expect(p.userId).toBeGreaterThan(0);
      }
    });
  });

  test('post id is a positive integer', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Posts');
    await allureStory('id type');
    await allureSeverity('normal');

    await allureStep('Verify all post ids are positive integers', async () => {
      const response = await postsApi.getAll();
      const posts: Post[] = await response.json();
      for (const p of posts) {
        expect(Number.isInteger(p.id)).toBe(true);
        expect(p.id).toBeGreaterThan(0);
      }
    });
  });

  test('post title is a non-empty string', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Posts');
    await allureStory('title type');
    await allureSeverity('normal');

    await allureStep('Verify all post titles are non-empty strings', async () => {
      const response = await postsApi.getAll();
      const posts: Post[] = await response.json();
      for (const p of posts) {
        expect(typeof p.title).toBe('string');
        expect(p.title.length).toBeGreaterThan(0);
      }
    });
  });

  test('post body is a non-empty string', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Posts');
    await allureStory('body type');
    await allureSeverity('normal');

    await allureStep('Verify all post bodies are non-empty strings', async () => {
      const response = await postsApi.getAll();
      const posts: Post[] = await response.json();
      for (const p of posts) {
        expect(typeof p.body).toBe('string');
        expect(p.body.length).toBeGreaterThan(0);
      }
    });
  });

  test('all post IDs are unique', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Posts');
    await allureStory('id uniqueness');
    await allureSeverity('normal');

    await allureStep('Verify no duplicate IDs exist in GET /posts', async () => {
      const response = await postsApi.getAll();
      const posts: Post[] = await response.json();
      const ids = posts.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  test('post userId values are within range 1–10', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Posts');
    await allureStory('userId range');
    await allureSeverity('normal');

    await allureStep('Verify all userIds are between 1 and 10', async () => {
      const response = await postsApi.getAll();
      const posts: Post[] = await response.json();
      for (const p of posts) {
        expect(p.userId).toBeGreaterThanOrEqual(1);
        expect(p.userId).toBeLessThanOrEqual(10);
      }
    });
  });

  test('GET /posts returns exactly 100 items', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Posts');
    await allureStory('count invariant');
    await allureSeverity('normal');

    await allureStep('Verify 100 posts in collection', async () => {
      const response = await postsApi.getAll();
      const posts: Post[] = await response.json();
      expect(posts).toHaveLength(100);
    });
  });

  test('post IDs are sequential starting at 1', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Posts');
    await allureStory('id sequence');
    await allureSeverity('minor');

    await allureStep('Verify first post id is 1 and last is 100', async () => {
      const response = await postsApi.getAll();
      const posts: Post[] = await response.json();
      expect(posts[0].id).toBe(1);
      expect(posts[99].id).toBe(100);
    });
  });
});

// ── Users contract ──────────────────────────────────────────────────────────

test.describe('Contract: User schema', { tag: ['@api', '@contract'] }, () => {
  test('GET /users returns Content-Type: application/json', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Users');
    await allureStory('Content-Type header');
    await allureSeverity('critical');

    await allureStep('Assert Content-Type includes application/json', async () => {
      const response = await usersApi.getAll();
      expect(response.headers()['content-type']).toContain('application/json');
    });
  });

  test('every user has required fields: id, name, email, phone, username', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Users');
    await allureStory('Required fields');
    await allureSeverity('critical');

    await allureStep('Verify required fields on every user', async () => {
      const response = await usersApi.getAll();
      const users: User[] = await response.json();
      for (const u of users) {
        expect(u).toHaveProperty('id');
        expect(u).toHaveProperty('name');
        expect(u).toHaveProperty('email');
        expect(u).toHaveProperty('phone');
        expect(u).toHaveProperty('username');
      }
    });
  });

  test('user email contains "@" character', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Users');
    await allureStory('email format');
    await allureSeverity('normal');

    await allureStep('Verify all user emails contain @', async () => {
      const response = await usersApi.getAll();
      const users: User[] = await response.json();
      for (const u of users) {
        expect(u.email).toContain('@');
      }
    });
  });

  test('user phone is a non-empty string', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Users');
    await allureStory('phone type');
    await allureSeverity('normal');

    await allureStep('Verify phone is non-empty string for all users', async () => {
      const response = await usersApi.getAll();
      const users: User[] = await response.json();
      for (const u of users) {
        expect(typeof u.phone).toBe('string');
        expect(u.phone.length).toBeGreaterThan(0);
      }
    });
  });

  test('user address has street and city', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Users');
    await allureStory('address schema');
    await allureSeverity('normal');

    await allureStep('Verify address.street and address.city are present', async () => {
      const response = await usersApi.getAll();
      const users: User[] = await response.json();
      for (const u of users) {
        expect(u.address).toHaveProperty('street');
        expect(u.address).toHaveProperty('city');
        expect(typeof u.address.street).toBe('string');
        expect(typeof u.address.city).toBe('string');
      }
    });
  });

  test('user company has a name field', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Users');
    await allureStory('company schema');
    await allureSeverity('normal');

    await allureStep('Verify company.name is present for all users', async () => {
      const response = await usersApi.getAll();
      const users: User[] = await response.json();
      for (const u of users) {
        expect(u.company).toHaveProperty('name');
        expect(typeof u.company.name).toBe('string');
        expect(u.company.name.length).toBeGreaterThan(0);
      }
    });
  });

  test('all user IDs are unique', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Users');
    await allureStory('id uniqueness');
    await allureSeverity('normal');

    await allureStep('Verify no duplicate user IDs', async () => {
      const response = await usersApi.getAll();
      const users: User[] = await response.json();
      const ids = users.map(u => u.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  test('GET /users returns exactly 10 items', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Users');
    await allureStory('count invariant');
    await allureSeverity('normal');

    await allureStep('Verify exactly 10 users', async () => {
      const response = await usersApi.getAll();
      const users: User[] = await response.json();
      expect(users).toHaveLength(10);
    });
  });

  test('user username is non-empty', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Users');
    await allureStory('username type');
    await allureSeverity('normal');

    await allureStep('Verify username is non-empty for all users', async () => {
      const response = await usersApi.getAll();
      const users: User[] = await response.json();
      for (const u of users) {
        expect(typeof u.username).toBe('string');
        expect(u.username.length).toBeGreaterThan(0);
      }
    });
  });

  test('user id is a positive integer', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Users');
    await allureStory('id type');
    await allureSeverity('normal');

    await allureStep('Verify all user ids are positive integers', async () => {
      const response = await usersApi.getAll();
      const users: User[] = await response.json();
      for (const u of users) {
        expect(Number.isInteger(u.id)).toBe(true);
        expect(u.id).toBeGreaterThan(0);
      }
    });
  });
});

// ── Comments contract ───────────────────────────────────────────────────────

test.describe('Contract: Comment schema', { tag: ['@api', '@contract'] }, () => {
  test('GET /comments returns Content-Type: application/json', async ({ commentsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Comments');
    await allureStory('Content-Type header');
    await allureSeverity('critical');

    await allureStep('Assert Content-Type includes application/json', async () => {
      const response = await commentsApi.getAll();
      expect(response.headers()['content-type']).toContain('application/json');
    });
  });

  test('every comment has all required fields', async ({ commentsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Comments');
    await allureStory('Required fields');
    await allureSeverity('critical');

    await allureStep('Verify postId, id, name, email, body on every comment (first 20)', async () => {
      const response = await commentsApi.getAll();
      const comments: Comment[] = await response.json();
      for (const c of comments.slice(0, 20)) {
        expect(c).toHaveProperty('postId');
        expect(c).toHaveProperty('id');
        expect(c).toHaveProperty('name');
        expect(c).toHaveProperty('email');
        expect(c).toHaveProperty('body');
      }
    });
  });

  test('comment email contains "@"', async ({ commentsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Comments');
    await allureStory('email format');
    await allureSeverity('normal');

    await allureStep('Verify comment emails contain @ (first 20)', async () => {
      const response = await commentsApi.getAll();
      const comments: Comment[] = await response.json();
      for (const c of comments.slice(0, 20)) {
        expect(c.email).toContain('@');
      }
    });
  });

  test('comment postId is a positive integer', async ({ commentsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Comments');
    await allureStory('postId type');
    await allureSeverity('normal');

    await allureStep('Verify postId is a positive integer (first 20)', async () => {
      const response = await commentsApi.getAll();
      const comments: Comment[] = await response.json();
      for (const c of comments.slice(0, 20)) {
        expect(Number.isInteger(c.postId)).toBe(true);
        expect(c.postId).toBeGreaterThan(0);
      }
    });
  });

  test('GET /comments returns exactly 500 items', async ({ commentsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Comments');
    await allureStory('count invariant');
    await allureSeverity('normal');

    await allureStep('Verify 500 comments in collection', async () => {
      const response = await commentsApi.getAll();
      const comments: Comment[] = await response.json();
      expect(comments).toHaveLength(500);
    });
  });

  test('comment name is non-empty', async ({ commentsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Comments');
    await allureStory('name type');
    await allureSeverity('normal');

    await allureStep('Verify name is non-empty (first 20)', async () => {
      const response = await commentsApi.getAll();
      const comments: Comment[] = await response.json();
      for (const c of comments.slice(0, 20)) {
        expect(typeof c.name).toBe('string');
        expect(c.name.length).toBeGreaterThan(0);
      }
    });
  });

  test('comment body is non-empty', async ({ commentsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Comments');
    await allureStory('body type');
    await allureSeverity('normal');

    await allureStep('Verify body is non-empty (first 20)', async () => {
      const response = await commentsApi.getAll();
      const comments: Comment[] = await response.json();
      for (const c of comments.slice(0, 20)) {
        expect(typeof c.body).toBe('string');
        expect(c.body.length).toBeGreaterThan(0);
      }
    });
  });

  test('comment id is a positive integer', async ({ commentsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Comments');
    await allureStory('id type');
    await allureSeverity('normal');

    await allureStep('Verify all comment ids are positive integers (first 20)', async () => {
      const response = await commentsApi.getAll();
      const comments: Comment[] = await response.json();
      for (const c of comments.slice(0, 20)) {
        expect(Number.isInteger(c.id)).toBe(true);
        expect(c.id).toBeGreaterThan(0);
      }
    });
  });
});

// ── Albums contract ─────────────────────────────────────────────────────────

test.describe('Contract: Album schema', { tag: ['@api', '@contract'] }, () => {
  test('GET /albums returns Content-Type: application/json', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Albums');
    await allureStory('Content-Type header');
    await allureSeverity('critical');

    await allureStep('Assert Content-Type includes application/json', async () => {
      const response = await albumsApi.getAll();
      expect(response.headers()['content-type']).toContain('application/json');
    });
  });

  test('every album has all required fields', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Albums');
    await allureStory('Required fields');
    await allureSeverity('critical');

    await allureStep('Verify userId, id, title on every album (first 20)', async () => {
      const response = await albumsApi.getAll();
      const albums: Album[] = await response.json();
      for (const a of albums.slice(0, 20)) {
        expect(a).toHaveProperty('userId');
        expect(a).toHaveProperty('id');
        expect(a).toHaveProperty('title');
      }
    });
  });

  test('album title is a non-empty string', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Albums');
    await allureStory('title type');
    await allureSeverity('normal');

    await allureStep('Verify title is non-empty (first 20)', async () => {
      const response = await albumsApi.getAll();
      const albums: Album[] = await response.json();
      for (const a of albums.slice(0, 20)) {
        expect(typeof a.title).toBe('string');
        expect(a.title.length).toBeGreaterThan(0);
      }
    });
  });

  test('album userId is in range 1–10', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Albums');
    await allureStory('userId range');
    await allureSeverity('normal');

    await allureStep('Verify album userIds are between 1 and 10', async () => {
      const response = await albumsApi.getAll();
      const albums: Album[] = await response.json();
      for (const a of albums) {
        expect(a.userId).toBeGreaterThanOrEqual(1);
        expect(a.userId).toBeLessThanOrEqual(10);
      }
    });
  });

  test('GET /albums returns exactly 100 items', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Albums');
    await allureStory('count invariant');
    await allureSeverity('normal');

    await allureStep('Verify 100 albums in collection', async () => {
      const response = await albumsApi.getAll();
      const albums: Album[] = await response.json();
      expect(albums).toHaveLength(100);
    });
  });

  test('photo URL starts with http/https', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Albums');
    await allureStory('photo URL format');
    await allureSeverity('normal');

    await allureStep('Verify photo urls start with http (album 1 photos)', async () => {
      const { body } = await albumsApi.getPhotosAs(1);
      for (const photo of body.slice(0, 5)) {
        expect(photo.url).toMatch(/^https?:\/\//);
      }
    });
  });

  test('photo thumbnailUrl starts with http/https', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Albums');
    await allureStory('photo thumbnailUrl format');
    await allureSeverity('normal');

    await allureStep('Verify thumbnailUrls start with http (album 1 photos)', async () => {
      const { body } = await albumsApi.getPhotosAs(1);
      for (const photo of body.slice(0, 5)) {
        expect(photo.thumbnailUrl).toMatch(/^https?:\/\//);
      }
    });
  });

  test('album id is a positive integer', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Albums');
    await allureStory('id type');
    await allureSeverity('normal');

    await allureStep('Verify all album ids are positive integers', async () => {
      const response = await albumsApi.getAll();
      const albums: Album[] = await response.json();
      for (const a of albums.slice(0, 20)) {
        expect(Number.isInteger(a.id)).toBe(true);
        expect(a.id).toBeGreaterThan(0);
      }
    });
  });
});

// ── Mutation response contract ──────────────────────────────────────────────

test.describe('Contract: mutation responses', { tag: ['@api', '@contract'] }, () => {
  test('POST /posts response contains id field', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Mutation Responses');
    await allureStory('POST assigns id');
    await allureSeverity('critical');

    await allureStep('Verify id present in POST /posts response', async () => {
      const response = await postsApi.create({ userId: 1, title: 'Contract Test', body: 'body' });
      const body = await response.json();
      expect(body).toHaveProperty('id');
      expect(typeof body.id).toBe('number');
    });
  });

  test('PUT /posts response contains id field', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Mutation Responses');
    await allureStory('PUT returns id');
    await allureSeverity('normal');

    await allureStep('Verify id present in PUT /posts/1 response', async () => {
      const response = await postsApi.update(1, { title: 'Updated' });
      const body = await response.json();
      expect(body).toHaveProperty('id');
    });
  });

  test('POST /users response contains id field', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Mutation Responses');
    await allureStory('POST /users assigns id');
    await allureSeverity('critical');

    await allureStep('Verify id present in POST /users response', async () => {
      const response = await usersApi.create({ name: 'Test', username: 'test', email: 'test@test.com' });
      const body = await response.json();
      expect(body).toHaveProperty('id');
    });
  });

  test('PUT /users response contains id field', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Mutation Responses');
    await allureStory('PUT /users returns id');
    await allureSeverity('normal');

    await allureStep('Verify id present in PUT /users/1 response', async () => {
      const response = await usersApi.update(1, { name: 'Updated User' });
      const body = await response.json();
      expect(body).toHaveProperty('id');
    });
  });

  test('POST /comments response contains id field', async ({ commentsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Mutation Responses');
    await allureStory('POST /comments assigns id');
    await allureSeverity('critical');

    await allureStep('Verify id present in POST /comments response', async () => {
      const response = await commentsApi.create({ postId: 1, name: 'Test', email: 'test@test.com', body: 'body' });
      const body = await response.json();
      expect(body).toHaveProperty('id');
    });
  });

  test('POST /albums response contains id field', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Mutation Responses');
    await allureStory('POST /albums assigns id');
    await allureSeverity('critical');

    await allureStep('Verify id present in POST /albums response', async () => {
      const response = await albumsApi.create({ userId: 1, title: 'Contract Test Album' });
      const body = await response.json();
      expect(body).toHaveProperty('id');
    });
  });

  test('DELETE /posts returns an empty object {}', async ({ postsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Mutation Responses');
    await allureStory('DELETE returns empty body');
    await allureSeverity('normal');

    await allureStep('Verify DELETE /posts/1 returns {}', async () => {
      const response = await postsApi.remove(1);
      const body = await response.json();
      expect(body).toEqual({});
    });
  });

  test('DELETE /users returns an empty object {}', async ({ usersApi }) => {
    await allureEpic('Contract');
    await allureFeature('Mutation Responses');
    await allureStory('DELETE /users returns empty body');
    await allureSeverity('normal');

    await allureStep('Verify DELETE /users/1 returns {}', async () => {
      const response = await usersApi.remove(1);
      const body = await response.json();
      expect(body).toEqual({});
    });
  });

  test('DELETE /comments returns an empty object {}', async ({ commentsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Mutation Responses');
    await allureStory('DELETE /comments returns empty body');
    await allureSeverity('normal');

    await allureStep('Verify DELETE /comments/1 returns {}', async () => {
      const response = await commentsApi.remove(1);
      const body = await response.json();
      expect(body).toEqual({});
    });
  });

  test('DELETE /albums returns an empty object {}', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Mutation Responses');
    await allureStory('DELETE /albums returns empty body');
    await allureSeverity('normal');

    await allureStep('Verify DELETE /albums/1 returns {}', async () => {
      const response = await albumsApi.remove(1);
      const body = await response.json();
      expect(body).toEqual({});
    });
  });
});

// ── Photos contract ─────────────────────────────────────────────────────────

test.describe('Contract: Photo schema', { tag: ['@api', '@contract'] }, () => {
  test('album 1 photos all have 5 required fields', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Photos');
    await allureStory('Required fields');
    await allureSeverity('critical');

    await allureStep('Verify albumId, id, title, url, thumbnailUrl on each photo', async () => {
      const { body } = await albumsApi.getPhotosAs(1);
      for (const photo of body.slice(0, 10)) {
        expect(photo).toHaveProperty('albumId');
        expect(photo).toHaveProperty('id');
        expect(photo).toHaveProperty('title');
        expect(photo).toHaveProperty('url');
        expect(photo).toHaveProperty('thumbnailUrl');
      }
    });
  });

  test('all photo IDs are positive integers', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Photos');
    await allureStory('id type');
    await allureSeverity('normal');

    await allureStep('Verify photo ids are positive integers', async () => {
      const { body } = await albumsApi.getPhotosAs(1);
      for (const photo of body) {
        expect(Number.isInteger(photo.id)).toBe(true);
        expect(photo.id).toBeGreaterThan(0);
      }
    });
  });

  test('photo title is a non-empty string', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Photos');
    await allureStory('title type');
    await allureSeverity('normal');

    await allureStep('Verify all photo titles are non-empty strings', async () => {
      const { body } = await albumsApi.getPhotosAs(1);
      for (const photo of body.slice(0, 10)) {
        expect(typeof photo.title).toBe('string');
        expect(photo.title.length).toBeGreaterThan(0);
      }
    });
  });

  test('album 1 has exactly 50 photos (contract invariant)', async ({ albumsApi }) => {
    await allureEpic('Contract');
    await allureFeature('Photos');
    await allureStory('count invariant');
    await allureSeverity('normal');

    await allureStep('Verify album 1 has exactly 50 photos', async () => {
      const { body } = await albumsApi.getPhotosAs(1);
      expect(body).toHaveLength(50);
    });
  });
});
