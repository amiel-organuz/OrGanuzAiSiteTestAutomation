import { test, expect } from '../../src/fixtures';
import { ApiConstants } from '../../src/api/ApiConstants';
import { Comment, CreateCommentPayload } from '../../src/types/api.types';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';
import { APIResponse } from '@playwright/test';
import { attachRequestResponse } from './helpers';

const VALID_COMMENT_ID = 1;
const INVALID_COMMENT_ID = 99999;

const NEW_COMMENT: CreateCommentPayload = {
  postId: 1,
  name: 'Organuz Test Comment',
  email: 'tester@organuz.ai',
  body: 'This is a test comment from the automated suite.',
};

test.describe('GET /comments', { tag: '@api' }, () => {
  test('returns 200 with a non-empty array', async ({ commentsApi }) => {
    await allureEpic('API');
    await allureFeature('Comments');
    await allureStory('GET all comments');
    await allureSeverity('critical');

    let response!: APIResponse;

    await allureStep('Send GET /comments', async () => {
      response = await commentsApi.getAll();
      await attachRequestResponse('GET', '/comments', null, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });

    await allureStep('Assert non-empty array', async () => {
      const body: Comment[] = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  test('all comments match Comment schema', async ({ commentsApi }) => {
    await allureEpic('API');
    await allureFeature('Comments');
    await allureStory('GET all comments — schema');
    await allureSeverity('normal');

    await allureStep('Verify each comment has postId, id, name, email, body', async () => {
      const response = await commentsApi.getAll();
      const body: Comment[] = await response.json();
      for (const comment of body.slice(0, 5)) {
        expect(comment).toMatchObject({
          postId: expect.any(Number),
          id: expect.any(Number),
          name: expect.any(String),
          email: expect.any(String),
          body: expect.any(String),
        });
      }
    });
  });

  test('first comment has id=1', async ({ commentsApi }) => {
    await allureEpic('API');
    await allureFeature('Comments');
    await allureStory('GET all comments — first id');
    await allureSeverity('minor');

    await allureStep('Verify first comment id is 1', async () => {
      const response = await commentsApi.getAll();
      const body: Comment[] = await response.json();
      expect(body[0].id).toBe(1);
    });
  });
});

test.describe('GET /comments/{id}', { tag: '@api' }, () => {
  test('returns 200 for valid comment id=1', async ({ commentsApi }) => {
    await allureEpic('API');
    await allureFeature('Comments');
    await allureStory('GET comment by id — valid');
    await allureSeverity('critical');

    let response!: APIResponse;
    let body!: Comment;

    await allureStep(`Send GET /comments/${VALID_COMMENT_ID}`, async () => {
      const result = await commentsApi.getByIdAs(VALID_COMMENT_ID);
      response = result.response;
      body = result.body;
      await attachRequestResponse('GET', `/comments/${VALID_COMMENT_ID}`, null, response);
    });

    await allureStep('Assert status 200 and id=1', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
      expect(body.id).toBe(VALID_COMMENT_ID);
    });
  });

  test('returns 404 for non-existent comment id', async ({ commentsApi }) => {
    await allureEpic('API');
    await allureFeature('Comments');
    await allureStory('GET comment by id — not found');
    await allureSeverity('normal');

    await allureStep(`GET /comments/${INVALID_COMMENT_ID} and expect 404`, async () => {
      const response = await commentsApi.getById(INVALID_COMMENT_ID);
      await attachRequestResponse('GET', `/comments/${INVALID_COMMENT_ID}`, null, response);
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });
});

test.describe('GET /comments?postId={id}', { tag: '@api' }, () => {
  test('returns 200 with comments filtered by postId=1', async ({ commentsApi }) => {
    await allureEpic('API');
    await allureFeature('Comments');
    await allureStory('GET comments by postId');
    await allureSeverity('normal');

    await allureStep('Send GET /comments?postId=1', async () => {
      const response = await commentsApi.getByPostId(1);
      await attachRequestResponse('GET', '/comments?postId=1', null, response);
      expect(response.status()).toBe(ApiConstants.OK);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  test('all comments returned by postId filter have postId=1', async ({ commentsApi }) => {
    await allureEpic('API');
    await allureFeature('Comments');
    await allureStory('GET comments by postId — filter integrity');
    await allureSeverity('normal');

    await allureStep('Verify all comments in response have postId=1', async () => {
      const response = await commentsApi.getByPostId(1);
      const body: Comment[] = await response.json();
      for (const comment of body) {
        expect(comment.postId).toBe(1);
      }
    });
  });
});

test.describe('POST /comments', { tag: '@api' }, () => {
  test('returns 201 on successful comment creation', async ({ commentsApi }) => {
    await allureEpic('API');
    await allureFeature('Comments');
    await allureStory('POST create comment — status');
    await allureSeverity('critical');

    let response!: APIResponse;

    await allureStep('Send POST /comments with valid payload', async () => {
      response = await commentsApi.create(NEW_COMMENT);
      await attachRequestResponse('POST', '/comments', NEW_COMMENT, response);
    });

    await allureStep('Assert status 201', async () => {
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });

  test('created comment echoes back the request fields', async ({ commentsApi }) => {
    await allureEpic('API');
    await allureFeature('Comments');
    await allureStory('POST create comment — response body');
    await allureSeverity('normal');

    await allureStep('Verify POST /comments response contains sent fields', async () => {
      const response = await commentsApi.create(NEW_COMMENT);
      const body: Comment = await response.json();
      expect(body.postId).toBe(NEW_COMMENT.postId);
      expect(body.name).toBe(NEW_COMMENT.name);
      expect(body.email).toBe(NEW_COMMENT.email);
    });
  });
});

test.describe('DELETE /comments/{id}', { tag: '@api' }, () => {
  test('returns 200 on successful comment delete', async ({ commentsApi }) => {
    await allureEpic('API');
    await allureFeature('Comments');
    await allureStory('DELETE comment — status');
    await allureSeverity('critical');

    let response!: APIResponse;

    await allureStep(`Send DELETE /comments/${VALID_COMMENT_ID}`, async () => {
      response = await commentsApi.remove(VALID_COMMENT_ID);
      await attachRequestResponse('DELETE', `/comments/${VALID_COMMENT_ID}`, null, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });
});
