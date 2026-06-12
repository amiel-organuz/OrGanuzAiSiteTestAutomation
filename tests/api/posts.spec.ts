import { test, expect } from '../../src/fixtures';
import { ApiConstants } from '../../src/api/ApiConstants';
import { Post, CreatePostPayload } from '../../src/types/api.types';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';
import { APIResponse } from '@playwright/test';
import { attachRequestResponse } from './helpers';

const VALID_POST_ID = 1;
const INVALID_POST_ID = 99999;

const NEW_POST: CreatePostPayload = {
  userId: 1,
  title: 'Organuz API Test — New Post',
  body: 'This is a test post created by the OrGanuz automation suite.',
};

test.describe('GET /posts', { tag: '@api' }, () => {
  test('returns 200 with a non-empty JSON array', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('GET all posts');
    await allureSeverity('critical');

    let response!: APIResponse;

    await allureStep('Send GET /posts', async () => {
      response = await postsApi.getAll();
      await attachRequestResponse('GET', '/posts', null, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });

    await allureStep('Assert non-empty array', async () => {
      const body: Post[] = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  test('returns 100 posts total', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('GET all posts — count');
    await allureSeverity('normal');

    await allureStep('GET /posts and verify count is 100', async () => {
      const response = await postsApi.getAll();
      const body: Post[] = await response.json();
      expect(body).toHaveLength(100);
    });
  });

  test('all posts match Post schema', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('GET all posts — schema');
    await allureSeverity('normal');

    await allureStep('Verify each post has userId, id, title, body', async () => {
      const response = await postsApi.getAll();
      const body: Post[] = await response.json();
      for (const post of body.slice(0, 5)) {
        expect(post).toMatchObject({
          userId: expect.any(Number),
          id: expect.any(Number),
          title: expect.any(String),
          body: expect.any(String),
        });
      }
    });
  });
});

test.describe('GET /posts/{id}', { tag: '@api' }, () => {
  test('returns 200 and correct body for id=1', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('GET post by id — valid');
    await allureSeverity('critical');

    let response!: APIResponse;
    let body!: Post;

    await allureStep(`Send GET /posts/${VALID_POST_ID}`, async () => {
      const result = await postsApi.getByIdAs(VALID_POST_ID);
      response = result.response;
      body = result.body;
      await attachRequestResponse('GET', `/posts/${VALID_POST_ID}`, null, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });

    await allureStep('Assert correct id and userId', async () => {
      expect(body.id).toBe(VALID_POST_ID);
      expect(body.userId).toBe(1);
      expect(typeof body.title).toBe('string');
      expect(body.title.length).toBeGreaterThan(0);
    });
  });

  test('returns 404 for non-existent id', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('GET post by id — not found');
    await allureSeverity('normal');

    await allureStep(`Send GET /posts/${INVALID_POST_ID} and expect 404`, async () => {
      const response = await postsApi.getById(INVALID_POST_ID);
      await attachRequestResponse('GET', `/posts/${INVALID_POST_ID}`, null, response);
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });

  test('id field in response matches requested id', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('GET post by id — id integrity');
    await allureSeverity('normal');

    const testId = 5;

    await allureStep(`GET /posts/${testId} and verify id=${testId} in response`, async () => {
      const { body } = await postsApi.getByIdAs(testId);
      expect(body.id).toBe(testId);
    });
  });
});

test.describe('GET /posts/{id}/comments', { tag: '@api' }, () => {
  test('returns 200 with comments for post 1', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('GET post comments');
    await allureSeverity('normal');

    await allureStep('Send GET /posts/1/comments', async () => {
      const response = await postsApi.getComments(1);
      await attachRequestResponse('GET', '/posts/1/comments', null, response);
      expect(response.status()).toBe(ApiConstants.OK);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  test('all returned comments have postId=1', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('GET post comments — postId filter');
    await allureSeverity('normal');

    await allureStep('Verify all comments have postId=1', async () => {
      const response = await postsApi.getComments(1);
      const body = await response.json();
      for (const comment of body) {
        expect(comment.postId).toBe(1);
      }
    });
  });
});

test.describe('POST /posts', { tag: '@api' }, () => {
  test('returns 201 on successful creation', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('POST create post — status');
    await allureSeverity('critical');

    let response!: APIResponse;

    await allureStep('Send POST /posts with valid payload', async () => {
      response = await postsApi.create(NEW_POST);
      await attachRequestResponse('POST', '/posts', NEW_POST, response);
    });

    await allureStep('Assert status 201 Created', async () => {
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });

  test('created post echoes back the request fields', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('POST create post — response body');
    await allureSeverity('normal');

    await allureStep('Verify POST /posts response contains sent fields', async () => {
      const response = await postsApi.create(NEW_POST);
      const body: Post = await response.json();
      expect(body.userId).toBe(NEW_POST.userId);
      expect(body.title).toBe(NEW_POST.title);
      expect(body.body).toBe(NEW_POST.body);
    });
  });

  test('created post has a new id assigned', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('POST create post — id assigned');
    await allureSeverity('normal');

    await allureStep('Verify POST /posts assigns an id > 100', async () => {
      const response = await postsApi.create(NEW_POST);
      const body: Post = await response.json();
      expect(typeof body.id).toBe('number');
      expect(body.id).toBeGreaterThan(100);
    });
  });
});

test.describe('PUT /posts/{id}', { tag: '@api' }, () => {
  test('returns 200 on successful update', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('PUT update post — status');
    await allureSeverity('critical');

    const updated = { ...NEW_POST, title: 'Updated Title', id: VALID_POST_ID };
    let response!: APIResponse;

    await allureStep(`Send PUT /posts/${VALID_POST_ID}`, async () => {
      response = await postsApi.update(VALID_POST_ID, updated);
      await attachRequestResponse('PUT', `/posts/${VALID_POST_ID}`, updated, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });

  test('updated post reflects new title in response', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('PUT update post — title updated');
    await allureSeverity('normal');

    const newTitle = 'Updated Title from Organuz Tests';

    await allureStep('Verify PUT /posts/1 reflects updated title', async () => {
      const response = await postsApi.update(VALID_POST_ID, { title: newTitle });
      const body: Post = await response.json();
      expect(body.title).toBe(newTitle);
    });
  });

  test('updated post reflects new body in response', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('PUT update post — body updated');
    await allureSeverity('normal');

    const newBody = 'Updated body content from automated test.';

    await allureStep('Verify PUT /posts/1 reflects updated body', async () => {
      const response = await postsApi.update(VALID_POST_ID, { body: newBody });
      const responseBody: Post = await response.json();
      expect(responseBody.body).toBe(newBody);
    });
  });
});

test.describe('DELETE /posts/{id}', { tag: '@api' }, () => {
  test('returns 200 on successful delete', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('DELETE post — status');
    await allureSeverity('critical');

    let response!: APIResponse;

    await allureStep(`Send DELETE /posts/${VALID_POST_ID}`, async () => {
      response = await postsApi.remove(VALID_POST_ID);
      await attachRequestResponse('DELETE', `/posts/${VALID_POST_ID}`, null, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });

  test('delete response body is an empty object', async ({ postsApi }) => {
    await allureEpic('API');
    await allureFeature('Posts');
    await allureStory('DELETE post — empty response body');
    await allureSeverity('normal');

    await allureStep('Verify DELETE /posts/1 returns {}', async () => {
      const response = await postsApi.remove(VALID_POST_ID);
      const body = await response.json();
      expect(body).toEqual({});
    });
  });
});
