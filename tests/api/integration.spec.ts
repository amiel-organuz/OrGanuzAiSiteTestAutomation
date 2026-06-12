/**
 * Integration tests — multi-step, cross-resource flows that verify end-to-end API behaviour.
 * Each test exercises a realistic user journey (CRUD lifecycle, resource relationships, etc.).
 */
import { test, expect } from '../../src/fixtures';
import { ApiConstants } from '../../src/api/ApiConstants';
import { Post, User, Comment, Album } from '../../src/types/api.types';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';

// ── Post CRUD lifecycle ──────────────────────────────────────────────────────

test.describe('Integration: Post CRUD lifecycle', { tag: ['@api', '@integration'] }, () => {
  test('create → read — new post can be retrieved after creation', async ({ postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Post Lifecycle');
    await allureStory('create → read');
    await allureSeverity('critical');

    let createdId!: number;

    await allureStep('Create a new post via POST /posts', async () => {
      const response = await postsApi.create({ userId: 1, title: 'Integration Test Post', body: 'Test body' });
      expect(response.status()).toBe(ApiConstants.CREATED);
      const body: Post = await response.json();
      createdId = body.id;
      expect(typeof createdId).toBe('number');
    });

    await allureStep('Verify created post id is assigned', async () => {
      expect(createdId).toBeGreaterThan(0);
    });
  });

  test('create → update — updated post reflects new title', async ({ postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Post Lifecycle');
    await allureStory('create → update');
    await allureSeverity('critical');

    await allureStep('Update post 1 title via PUT /posts/1', async () => {
      const response = await postsApi.update(1, { title: 'Integration Updated Title', body: 'Updated body', userId: 1 });
      expect(response.status()).toBe(ApiConstants.OK);
      const body: Post = await response.json();
      expect(body.title).toBe('Integration Updated Title');
    });
  });

  test('create → delete — DELETE returns 200 with empty body', async ({ postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Post Lifecycle');
    await allureStory('delete post');
    await allureSeverity('critical');

    await allureStep('Delete post 5 via DELETE /posts/5', async () => {
      const response = await postsApi.remove(5);
      expect(response.status()).toBe(ApiConstants.OK);
      const body = await response.json();
      expect(body).toEqual({});
    });
  });

  test('full CRUD-style flow: create → update existing → delete existing', async ({ postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Post Lifecycle');
    await allureStory('full CRUD cycle');
    await allureSeverity('critical');

    await allureStep('Step 1: Create post', async () => {
      const response = await postsApi.create({ userId: 2, title: 'Original Title', body: 'Original body' });
      const body: Post = await response.json();
      expect(response.status()).toBe(ApiConstants.CREATED);
      expect(body.id).toBeGreaterThan(0);
    });

    await allureStep('Step 2: Update an existing post', async () => {
      const response = await postsApi.update(1, { title: 'Updated Title', userId: 2, body: 'Updated body' });
      expect(response.status()).toBe(ApiConstants.OK);
      const body: Post = await response.json();
      expect(body.title).toBe('Updated Title');
    });

    await allureStep('Step 3: Delete an existing post', async () => {
      const response = await postsApi.remove(1);
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });
});

// ── Post–Comment relationship ───────────────────────────────────────────────

test.describe('Integration: Post–Comment relationship', { tag: ['@api', '@integration'] }, () => {
  test('GET /posts/1/comments returns comments for post 1', async ({ postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Post-Comment Relationship');
    await allureStory('post comments via route');
    await allureSeverity('critical');

    let comments!: Comment[];

    await allureStep('GET /posts/1/comments', async () => {
      const response = await postsApi.getComments(1);
      expect(response.status()).toBe(ApiConstants.OK);
      comments = await response.json();
      expect(Array.isArray(comments)).toBe(true);
      expect(comments.length).toBeGreaterThan(0);
    });

    await allureStep('All comments belong to post 1', async () => {
      for (const c of comments) {
        expect(c.postId).toBe(1);
      }
    });
  });

  test('filter comments by ?postId=2 returns only post 2 comments', async ({ commentsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Post-Comment Relationship');
    await allureStory('filter comments by postId');
    await allureSeverity('normal');

    await allureStep('GET /comments?postId=2 and verify all have postId=2', async () => {
      const response = await commentsApi.getByPostId(2);
      const comments: Comment[] = await response.json();
      for (const c of comments) {
        expect(c.postId).toBe(2);
      }
    });
  });

  test('create comment for post 1 → verify postId echoed back', async ({ commentsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Post-Comment Relationship');
    await allureStory('create comment for specific post');
    await allureSeverity('normal');

    await allureStep('POST /comments with postId=1 and verify response', async () => {
      const payload = { postId: 1, name: 'Integration Tester', email: 'int@test.com', body: 'Integration comment' };
      const response = await commentsApi.create(payload);
      expect(response.status()).toBe(ApiConstants.CREATED);
      const body: Comment = await response.json();
      expect(body.postId).toBe(1);
      expect(body.name).toBe(payload.name);
    });
  });

  test('both /posts/{id}/comments and /comments?postId={id} return array', async ({ postsApi, commentsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Post-Comment Relationship');
    await allureStory('two routes for same data');
    await allureSeverity('normal');

    await allureStep('Both routes return 200 with arrays for post 3', async () => {
      const [r1, r2] = await Promise.all([
        postsApi.getComments(3),
        commentsApi.getByPostId(3),
      ]);
      expect(r1.status()).toBe(ApiConstants.OK);
      expect(r2.status()).toBe(ApiConstants.OK);
      const posts3Comments = await r1.json();
      const filtered3Comments = await r2.json();
      expect(Array.isArray(posts3Comments)).toBe(true);
      expect(Array.isArray(filtered3Comments)).toBe(true);
    });
  });
});

// ── User–Post relationship ──────────────────────────────────────────────────

test.describe('Integration: User–Post relationship', { tag: ['@api', '@integration'] }, () => {
  test("GET /users/1/posts returns posts that all belong to user 1", async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('User-Post Relationship');
    await allureStory('user posts route');
    await allureSeverity('critical');

    let posts!: Post[];

    await allureStep('GET /users/1/posts', async () => {
      const response = await usersApi.getPosts(1);
      expect(response.status()).toBe(ApiConstants.OK);
      posts = await response.json();
      expect(Array.isArray(posts)).toBe(true);
    });

    await allureStep('All posts have userId=1', async () => {
      for (const p of posts) {
        expect(p.userId).toBe(1);
      }
    });
  });

  test("user 1 has exactly 10 posts", async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('User-Post Relationship');
    await allureStory('user post count');
    await allureSeverity('normal');

    await allureStep('Verify user 1 has 10 posts', async () => {
      const response = await usersApi.getPosts(1);
      const posts: Post[] = await response.json();
      expect(posts).toHaveLength(10);
    });
  });

  test('GET user then GET user posts — posts contain valid userId', async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('User-Post Relationship');
    await allureStory('user → posts cross-check');
    await allureSeverity('normal');

    await allureStep('Get user 2, then get user 2 posts and verify userId', async () => {
      const [userResult, postsResponse] = await Promise.all([
        usersApi.getByIdAs(2),
        usersApi.getPosts(2),
      ]);
      const posts: Post[] = await postsResponse.json();
      expect(userResult.body.id).toBe(2);
      for (const p of posts) {
        expect(p.userId).toBe(userResult.body.id);
      }
    });
  });
});

// ── User–Album relationship ─────────────────────────────────────────────────

test.describe('Integration: User–Album relationship', { tag: ['@api', '@integration'] }, () => {
  test("GET /users/1/albums returns albums that all belong to user 1", async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('User-Album Relationship');
    await allureStory('user albums route');
    await allureSeverity('critical');

    let albums!: Album[];

    await allureStep('GET /users/1/albums', async () => {
      const response = await usersApi.getAlbums(1);
      expect(response.status()).toBe(ApiConstants.OK);
      albums = await response.json();
      expect(Array.isArray(albums)).toBe(true);
    });

    await allureStep('All albums have userId=1', async () => {
      for (const a of albums) {
        expect(a.userId).toBe(1);
      }
    });
  });

  test("user 1 has exactly 10 albums", async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('User-Album Relationship');
    await allureStory('user album count');
    await allureSeverity('normal');

    await allureStep('Verify user 1 has 10 albums', async () => {
      const response = await usersApi.getAlbums(1);
      const albums: Album[] = await response.json();
      expect(albums).toHaveLength(10);
    });
  });
});

// ── Album–Photo relationship ────────────────────────────────────────────────

test.describe('Integration: Album–Photo relationship', { tag: ['@api', '@integration'] }, () => {
  test('GET /albums/1/photos returns photos all with albumId=1', async ({ albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Album-Photo Relationship');
    await allureStory('album photos route');
    await allureSeverity('critical');

    await allureStep('GET /albums/1/photos and verify all have albumId=1', async () => {
      const { body } = await albumsApi.getPhotosAs(1);
      for (const photo of body) {
        expect(photo.albumId).toBe(1);
      }
    });
  });

  test('album 1 has exactly 50 photos', async ({ albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Album-Photo Relationship');
    await allureStory('photo count per album');
    await allureSeverity('normal');

    await allureStep('Verify album 1 has 50 photos', async () => {
      const { body } = await albumsApi.getPhotosAs(1);
      expect(body).toHaveLength(50);
    });
  });

  test('get album → get its photos → photos have correct albumId', async ({ albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Album-Photo Relationship');
    await allureStory('album → photos cross-check');
    await allureSeverity('normal');

    await allureStep('Get album 3, then its photos, verify albumId=3', async () => {
      const [albumResult, photosResult] = await Promise.all([
        albumsApi.getByIdAs(3),
        albumsApi.getPhotosAs(3),
      ]);
      expect(albumResult.body.id).toBe(3);
      for (const photo of photosResult.body) {
        expect(photo.albumId).toBe(albumResult.body.id);
      }
    });
  });
});

// ── Cross-resource parallel requests ────────────────────────────────────────

test.describe('Integration: parallel requests', { tag: ['@api', '@integration'] }, () => {
  test('parallel GET requests to all 4 resources return 200', async ({ postsApi, usersApi, commentsApi, albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Parallel Requests');
    await allureStory('concurrent requests');
    await allureSeverity('normal');

    await allureStep('Fire GET /posts, /users, /comments, /albums simultaneously', async () => {
      const [posts, users, comments, albums] = await Promise.all([
        postsApi.getAll(),
        usersApi.getAll(),
        commentsApi.getAll(),
        albumsApi.getAll(),
      ]);
      expect(posts.status()).toBe(ApiConstants.OK);
      expect(users.status()).toBe(ApiConstants.OK);
      expect(comments.status()).toBe(ApiConstants.OK);
      expect(albums.status()).toBe(ApiConstants.OK);
    });
  });

  test('parallel GET by-id requests return distinct data', async ({ postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Parallel Requests');
    await allureStory('concurrent by-id requests');
    await allureSeverity('normal');

    await allureStep('Fetch posts 10, 20, 30 in parallel and verify distinct ids', async () => {
      const [r10, r20, r30] = await Promise.all([
        postsApi.getByIdAs(10),
        postsApi.getByIdAs(20),
        postsApi.getByIdAs(30),
      ]);
      expect(r10.body.id).toBe(10);
      expect(r20.body.id).toBe(20);
      expect(r30.body.id).toBe(30);
    });
  });

  test('parallel mutations on different resources succeed independently', async ({ postsApi, usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('Parallel Requests');
    await allureStory('concurrent mutations');
    await allureSeverity('normal');

    await allureStep('Simultaneously POST to /posts and PUT to /users/1', async () => {
      const [postRes, userRes] = await Promise.all([
        postsApi.create({ userId: 1, title: 'Parallel Post', body: 'body' }),
        usersApi.update(1, { name: 'Parallel Update' }),
      ]);
      expect(postRes.status()).toBe(ApiConstants.CREATED);
      expect(userRes.status()).toBe(ApiConstants.OK);
    });
  });
});

// ── Data consistency checks ─────────────────────────────────────────────────

test.describe('Integration: data consistency', { tag: ['@api', '@integration'] }, () => {
  test('total comments equals sum across all posts (500 = 100 posts × 5)', async ({ commentsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Data Consistency');
    await allureStory('comment total matches expected');
    await allureSeverity('normal');

    await allureStep('GET /comments and verify 500 total', async () => {
      const response = await commentsApi.getAll();
      const comments: Comment[] = await response.json();
      expect(comments.length).toBe(500);
    });
  });

  test('sum of all user posts across 10 users equals 100', async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('Data Consistency');
    await allureStory('post total matches expected');
    await allureSeverity('normal');

    await allureStep('GET posts for all 10 users and verify total=100', async () => {
      let totalPosts = 0;
      for (let userId = 1; userId <= 10; userId++) {
        const response = await usersApi.getPosts(userId);
        const posts: Post[] = await response.json();
        totalPosts += posts.length;
      }
      expect(totalPosts).toBe(100);
    });
  });

  test('GET /albums/{id} and GET /users/{userId}/albums are consistent', async ({ albumsApi, usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('Data Consistency');
    await allureStory('album access routes consistent');
    await allureSeverity('normal');

    await allureStep('Album 1 userId from /albums/1 matches /users/1/albums first entry', async () => {
      const [albumResult, userAlbumsResponse] = await Promise.all([
        albumsApi.getByIdAs(1),
        usersApi.getAlbums(1),
      ]);
      const userAlbums: Album[] = await userAlbumsResponse.json();
      const matchingAlbum = userAlbums.find(a => a.id === 1);
      expect(matchingAlbum).toBeDefined();
      expect(matchingAlbum!.userId).toBe(albumResult.body.userId);
    });
  });

  test('create 3 posts in sequence — each returns an assigned id', async ({ postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Data Consistency');
    await allureStory('sequential creation ids');
    await allureSeverity('normal');

    await allureStep('Create 3 posts and verify each gets an id', async () => {
      const ids: number[] = [];
      for (let i = 0; i < 3; i++) {
        const response = await postsApi.create({ userId: 1, title: `Seq Post ${i}`, body: `body ${i}` });
        expect(response.status()).toBe(ApiConstants.CREATED);
        const body: Post = await response.json();
        expect(typeof body.id).toBe('number');
        expect(body.id).toBeGreaterThan(0);
        ids.push(body.id);
      }
      expect(ids).toHaveLength(3);
    });
  });
});

// ── User CRUD lifecycle ─────────────────────────────────────────────────────

test.describe('Integration: User CRUD lifecycle', { tag: ['@api', '@integration'] }, () => {
  test('create user → verify 201 and id assigned', async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('User Lifecycle');
    await allureStory('create user');
    await allureSeverity('critical');

    await allureStep('POST /users and verify 201 with id', async () => {
      const response = await usersApi.create({ name: 'Integration User', username: 'intuser', email: 'int@organuz.ai' });
      expect(response.status()).toBe(ApiConstants.CREATED);
      const body = await response.json();
      expect(body).toHaveProperty('id');
      expect(body.name).toBe('Integration User');
    });
  });

  test('update user → response reflects new name', async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('User Lifecycle');
    await allureStory('update user');
    await allureSeverity('critical');

    await allureStep('PUT /users/2 and verify updated name', async () => {
      const response = await usersApi.update(2, { name: 'Integration Updated' });
      expect(response.status()).toBe(ApiConstants.OK);
      const body = await response.json();
      expect(body.name).toBe('Integration Updated');
    });
  });

  test('delete user → response is 200 with empty body', async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('User Lifecycle');
    await allureStory('delete user');
    await allureSeverity('critical');

    await allureStep('DELETE /users/3 and verify 200 with {}', async () => {
      const response = await usersApi.remove(3);
      expect(response.status()).toBe(ApiConstants.OK);
      const body = await response.json();
      expect(body).toEqual({});
    });
  });

  test('users 1–10 all return 200 individually', async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('User Lifecycle');
    await allureStory('all users accessible');
    await allureSeverity('normal');

    await allureStep('Verify GET /users/1 through /users/10 all return 200', async () => {
      for (let id = 1; id <= 10; id++) {
        const response = await usersApi.getById(id);
        expect(response.status()).toBe(ApiConstants.OK);
      }
    });
  });
});

// ── Comment CRUD lifecycle ──────────────────────────────────────────────────

test.describe('Integration: Comment CRUD lifecycle', { tag: ['@api', '@integration'] }, () => {
  test('create comment → verify 201 and fields echo', async ({ commentsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Comment Lifecycle');
    await allureStory('create comment');
    await allureSeverity('critical');

    await allureStep('POST /comments and verify 201', async () => {
      const payload = { postId: 5, name: 'Integration Comment', email: 'int@organuz.ai', body: 'Integration comment body' };
      const response = await commentsApi.create(payload);
      expect(response.status()).toBe(ApiConstants.CREATED);
      const body: Comment = await response.json();
      expect(body.postId).toBe(5);
      expect(body.email).toBe('int@organuz.ai');
    });
  });

  test('update comment → response reflects new body', async ({ commentsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Comment Lifecycle');
    await allureStory('update comment');
    await allureSeverity('normal');

    await allureStep('PUT /comments/5 and verify updated body', async () => {
      const newBody = 'Updated integration comment body';
      const response = await commentsApi.update(5, { body: newBody });
      expect(response.status()).toBe(ApiConstants.OK);
      const body = await response.json();
      expect(body.body).toBe(newBody);
    });
  });

  test('delete comment → response is 200 with empty body', async ({ commentsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Comment Lifecycle');
    await allureStory('delete comment');
    await allureSeverity('normal');

    await allureStep('DELETE /comments/3 and verify 200 with {}', async () => {
      const response = await commentsApi.remove(3);
      expect(response.status()).toBe(ApiConstants.OK);
      const body = await response.json();
      expect(body).toEqual({});
    });
  });
});

// ── Album CRUD lifecycle ────────────────────────────────────────────────────

test.describe('Integration: Album CRUD lifecycle', { tag: ['@api', '@integration'] }, () => {
  test('create album → verify 201 and title echoed', async ({ albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Album Lifecycle');
    await allureStory('create album');
    await allureSeverity('critical');

    await allureStep('POST /albums and verify 201', async () => {
      const payload = { userId: 3, title: 'Integration Album' };
      const response = await albumsApi.create(payload);
      expect(response.status()).toBe(ApiConstants.CREATED);
      const body: Album = await response.json();
      expect(body.title).toBe('Integration Album');
    });
  });

  test('update album → response reflects new title', async ({ albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Album Lifecycle');
    await allureStory('update album');
    await allureSeverity('normal');

    await allureStep('PUT /albums/2 and verify updated title', async () => {
      const response = await albumsApi.update(2, { title: 'Updated Integration Album' });
      expect(response.status()).toBe(ApiConstants.OK);
      const body: Album = await response.json();
      expect(body.title).toBe('Updated Integration Album');
    });
  });

  test('delete album → response is 200 with empty body', async ({ albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Album Lifecycle');
    await allureStory('delete album');
    await allureSeverity('normal');

    await allureStep('DELETE /albums/2 and verify 200 with {}', async () => {
      const response = await albumsApi.remove(2);
      expect(response.status()).toBe(ApiConstants.OK);
      const body = await response.json();
      expect(body).toEqual({});
    });
  });
});

// ── Multi-user distribution ────────────────────────────────────────────────

test.describe('Integration: multi-user post distribution', { tag: ['@api', '@integration'] }, () => {
  test('every user (1–5) has at least one post', async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('Multi-User Distribution');
    await allureStory('each user has posts');
    await allureSeverity('normal');

    await allureStep('Verify users 1-5 each have ≥1 post', async () => {
      for (let userId = 1; userId <= 5; userId++) {
        const response = await usersApi.getPosts(userId);
        const posts: Post[] = await response.json();
        expect(posts.length).toBeGreaterThan(0);
      }
    });
  });

  test('every user (1–5) has at least one album', async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('Multi-User Distribution');
    await allureStory('each user has albums');
    await allureSeverity('normal');

    await allureStep('Verify users 1-5 each have ≥1 album', async () => {
      for (let userId = 1; userId <= 5; userId++) {
        const response = await usersApi.getAlbums(userId);
        const albums: Album[] = await response.json();
        expect(albums.length).toBeGreaterThan(0);
      }
    });
  });

  test('total posts across all 10 users matches GET /posts count', async ({ postsApi, usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('Multi-User Distribution');
    await allureStory('total posts consistency');
    await allureSeverity('normal');

    await allureStep('Sum all user posts and compare to /posts total', async () => {
      const allPostsResponse = await postsApi.getAll();
      const allPosts: Post[] = await allPostsResponse.json();
      const totalFromCollection = allPosts.length;

      let totalFromUsers = 0;
      for (let userId = 1; userId <= 10; userId++) {
        const response = await usersApi.getPosts(userId);
        const posts: Post[] = await response.json();
        totalFromUsers += posts.length;
      }
      expect(totalFromUsers).toBe(totalFromCollection);
    });
  });
});

// ── Resource range access ──────────────────────────────────────────────────

test.describe('Integration: resource range access', { tag: ['@api', '@integration'] }, () => {
  test('all 100 posts accessible individually (first 10)', async ({ postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Resource Access');
    await allureStory('posts 1-10 accessible');
    await allureSeverity('normal');

    await allureStep('GET /posts/1 through /posts/10 all return 200', async () => {
      for (let id = 1; id <= 10; id++) {
        const response = await postsApi.getById(id);
        expect(response.status()).toBe(ApiConstants.OK);
      }
    });
  });

  test('all 100 albums accessible (first 10 spot-check)', async ({ albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Resource Access');
    await allureStory('albums 1-10 accessible');
    await allureSeverity('normal');

    await allureStep('GET /albums/1 through /albums/10 all return 200', async () => {
      for (let id = 1; id <= 10; id++) {
        const response = await albumsApi.getById(id);
        expect(response.status()).toBe(ApiConstants.OK);
      }
    });
  });

  test('all 500 comments spot-check: comments 1, 100, 250, 500 return 200', async ({ commentsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Resource Access');
    await allureStory('comment range access');
    await allureSeverity('normal');

    await allureStep('GET /comments for IDs 1, 100, 250, 500', async () => {
      const ids = [1, 100, 250, 500];
      for (const id of ids) {
        const response = await commentsApi.getById(id);
        expect(response.status()).toBe(ApiConstants.OK);
      }
    });
  });
});

// ── End-to-end read journeys ────────────────────────────────────────────────

test.describe('Integration: end-to-end read journeys', { tag: ['@api', '@integration'] }, () => {
  test('user 1 profile → posts → first post comments', async ({ usersApi, postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('E2E Read Journey');
    await allureStory('user profile to post comments');
    await allureSeverity('critical');

    let firstPostId!: number;

    await allureStep('GET user 1 profile', async () => {
      const result = await usersApi.getByIdAs(1);
      expect(result.body.id).toBe(1);
    });

    await allureStep('GET user 1 posts and take first post id', async () => {
      const response = await usersApi.getPosts(1);
      const posts: Post[] = await response.json();
      expect(posts.length).toBeGreaterThan(0);
      firstPostId = posts[0].id;
    });

    await allureStep('GET comments for first post', async () => {
      const response = await postsApi.getComments(firstPostId);
      expect(response.status()).toBe(ApiConstants.OK);
      const comments = await response.json();
      expect(Array.isArray(comments)).toBe(true);
    });
  });

  test('album 2 → photos → verify all photos have albumId=2', async ({ albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('E2E Read Journey');
    await allureStory('album to photos');
    await allureSeverity('normal');

    await allureStep('GET album 2 and its photos, verify albumId integrity', async () => {
      const photosResult = await albumsApi.getPhotosAs(2);
      expect(photosResult.body.length).toBeGreaterThan(0);
      for (const photo of photosResult.body) {
        expect(photo.albumId).toBe(2);
      }
    });
  });

  test('user 5 → albums → first album photos', async ({ usersApi, albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('E2E Read Journey');
    await allureStory('user albums to photos');
    await allureSeverity('normal');

    await allureStep('GET user 5 albums then photos of first album', async () => {
      const albumsResponse = await usersApi.getAlbums(5);
      const albums: Album[] = await albumsResponse.json();
      expect(albums.length).toBeGreaterThan(0);
      const firstAlbumId = albums[0].id;
      const photosResult = await albumsApi.getPhotosAs(firstAlbumId);
      expect(photosResult.body.length).toBeGreaterThan(0);
      for (const photo of photosResult.body) {
        expect(photo.albumId).toBe(firstAlbumId);
      }
    });
  });

  test('GET post 10 → its comments via query filter', async ({ postsApi, commentsApi }) => {
    await allureEpic('Integration');
    await allureFeature('E2E Read Journey');
    await allureStory('post to filtered comments');
    await allureSeverity('normal');

    await allureStep('GET /posts/10 then /comments?postId=10', async () => {
      const { body: post } = await postsApi.getByIdAs(10);
      expect(post.id).toBe(10);
      const commentsResponse = await commentsApi.getByPostId(10);
      const comments: Comment[] = await commentsResponse.json();
      for (const c of comments) {
        expect(c.postId).toBe(10);
      }
    });
  });
});

// ── Write journeys ──────────────────────────────────────────────────────────

test.describe('Integration: write journeys', { tag: ['@api', '@integration'] }, () => {
  test('create post → add comment → comment postId matches new post', async ({ postsApi, commentsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Write Journey');
    await allureStory('create post and comment');
    await allureSeverity('critical');

    let newPostId!: number;

    await allureStep('Create new post via POST /posts', async () => {
      const response = await postsApi.create({ userId: 1, title: 'Journey Post', body: 'Journey body' });
      const body: Post = await response.json();
      newPostId = body.id;
      expect(typeof newPostId).toBe('number');
    });

    await allureStep('Create comment for the new post and verify postId', async () => {
      const response = await commentsApi.create({ postId: newPostId, name: 'Journey Comment', email: 'j@t.com', body: 'Comment body' });
      expect(response.status()).toBe(ApiConstants.CREATED);
      const body: Comment = await response.json();
      expect(body.postId).toBe(newPostId);
    });
  });

  test('create album → update existing album title → verify reflected in response', async ({ albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Write Journey');
    await allureStory('create and update album');
    await allureSeverity('normal');

    await allureStep('Create album, then update an existing title, verify new title in response', async () => {
      const createResponse = await albumsApi.create({ userId: 1, title: 'Original Title A' });
      expect(createResponse.status()).toBe(ApiConstants.CREATED);
      const created: Album = await createResponse.json();
      expect(created.title).toBe('Original Title A');

      const updateResponse = await albumsApi.update(1, { title: 'Updated Title B' });
      expect(updateResponse.status()).toBe(ApiConstants.OK);
      const updated: Album = await updateResponse.json();
      expect(updated.title).toBe('Updated Title B');
    });
  });

  test('create user → create post for new user → userId echoed', async ({ usersApi, postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Write Journey');
    await allureStory('create user and post');
    await allureSeverity('normal');

    let newUserId!: number;

    await allureStep('Create new user', async () => {
      const response = await usersApi.create({ name: 'Journey User', username: 'journeyuser', email: 'journey@organuz.ai' });
      expect(response.status()).toBe(ApiConstants.CREATED);
      const body = await response.json();
      newUserId = body.id;
    });

    await allureStep('Create post attributed to new user id, verify userId in response', async () => {
      const response = await postsApi.create({ userId: newUserId, title: 'Post for Journey User', body: 'body' });
      expect(response.status()).toBe(ApiConstants.CREATED);
      const body: Post = await response.json();
      expect(body.userId).toBe(newUserId);
    });
  });
});

// ── Aggregation spot-checks ────────────────────────────────────────────────

test.describe('Integration: aggregation spot-checks', { tag: ['@api', '@integration'] }, () => {
  test('posts 1–5 each have exactly 5 comments', async ({ postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Aggregation');
    await allureStory('comment count per post');
    await allureSeverity('normal');

    await allureStep('Verify posts 1-5 each have exactly 5 comments', async () => {
      for (let postId = 1; postId <= 5; postId++) {
        const response = await postsApi.getComments(postId);
        const comments = await response.json();
        expect(comments.length).toBe(5);
      }
    });
  });

  test('total albums across all 10 users equals 100', async ({ usersApi }) => {
    await allureEpic('Integration');
    await allureFeature('Aggregation');
    await allureStory('total albums count');
    await allureSeverity('normal');

    await allureStep('Sum all user albums and verify total=100', async () => {
      let total = 0;
      for (let userId = 1; userId <= 10; userId++) {
        const response = await usersApi.getAlbums(userId);
        const albums: Album[] = await response.json();
        total += albums.length;
      }
      expect(total).toBe(100);
    });
  });

  test('total photos across albums 1–10 equals 500', async ({ albumsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Aggregation');
    await allureStory('total photos count');
    await allureSeverity('normal');

    await allureStep('Sum photos for albums 1-10 and verify total=500', async () => {
      let total = 0;
      for (let albumId = 1; albumId <= 10; albumId++) {
        const { body } = await albumsApi.getPhotosAs(albumId);
        total += body.length;
      }
      expect(total).toBe(500);
    });
  });

  test('user 3 posts and user 3 in GET /posts are consistent', async ({ usersApi, postsApi }) => {
    await allureEpic('Integration');
    await allureFeature('Aggregation');
    await allureStory('user posts cross-route consistency');
    await allureSeverity('normal');

    await allureStep('Count user 3 posts via /users/3/posts and verify all have userId=3', async () => {
      const [userPostsResponse, allPostsResponse] = await Promise.all([
        usersApi.getPosts(3),
        postsApi.getAll(),
      ]);
      const userPosts: Post[] = await userPostsResponse.json();
      const allPosts: Post[] = await allPostsResponse.json();
      const user3PostsFromAll = allPosts.filter(p => p.userId === 3);
      expect(userPosts.length).toBe(user3PostsFromAll.length);
    });
  });
});
