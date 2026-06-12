import { test, expect } from '../../src/fixtures';
import { ApiConstants } from '../../src/api/ApiConstants';
import { User, CreateUserPayload } from '../../src/types/api.types';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';
import { APIResponse } from '@playwright/test';
import { attachRequestResponse } from './helpers';

const VALID_USER_ID = 1;
const INVALID_USER_ID = 99999;

const NEW_USER: CreateUserPayload = {
  name: 'Organuz Tester',
  username: 'organuz_tester',
  email: 'tester@organuz.ai',
};

test.describe('GET /users', { tag: '@api' }, () => {
  test('returns 200 with a non-empty array', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('GET all users');
    await allureSeverity('critical');

    let response!: APIResponse;

    await allureStep('Send GET /users', async () => {
      response = await usersApi.getAll();
      await attachRequestResponse('GET', '/users', null, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });

    await allureStep('Assert non-empty array', async () => {
      const body: User[] = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  test('returns exactly 10 users', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('GET all users — count');
    await allureSeverity('normal');

    await allureStep('Verify 10 users are returned', async () => {
      const response = await usersApi.getAll();
      const body: User[] = await response.json();
      expect(body).toHaveLength(10);
    });
  });

  test('all users match User schema', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('GET all users — schema');
    await allureSeverity('normal');

    await allureStep('Verify each user has id, name, email, phone', async () => {
      const response = await usersApi.getAll();
      const body: User[] = await response.json();
      for (const user of body) {
        expect(user).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          email: expect.any(String),
          phone: expect.any(String),
        });
      }
    });
  });

  test('first user has id=1', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('GET all users — first user id');
    await allureSeverity('minor');

    await allureStep('Verify first user id is 1', async () => {
      const response = await usersApi.getAll();
      const body: User[] = await response.json();
      expect(body[0].id).toBe(1);
    });
  });
});

test.describe('GET /users/{id}', { tag: '@api' }, () => {
  test('returns 200 for user id=1', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('GET user by id — valid');
    await allureSeverity('critical');

    let response!: APIResponse;
    let body!: User;

    await allureStep(`Send GET /users/${VALID_USER_ID}`, async () => {
      const result = await usersApi.getByIdAs(VALID_USER_ID);
      response = result.response;
      body = result.body;
      await attachRequestResponse('GET', `/users/${VALID_USER_ID}`, null, response);
    });

    await allureStep('Assert status 200 and id=1', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
      expect(body.id).toBe(VALID_USER_ID);
    });
  });

  test('user id=1 is named "Leanne Graham"', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('GET user by id — known data');
    await allureSeverity('normal');

    await allureStep('Verify user 1 name is "Leanne Graham"', async () => {
      const { body } = await usersApi.getByIdAs(VALID_USER_ID);
      expect(body.name).toBe('Leanne Graham');
    });
  });

  test('returns 404 for non-existent user id', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('GET user by id — not found');
    await allureSeverity('normal');

    await allureStep(`GET /users/${INVALID_USER_ID} and expect 404`, async () => {
      const response = await usersApi.getById(INVALID_USER_ID);
      await attachRequestResponse('GET', `/users/${INVALID_USER_ID}`, null, response);
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });
});

test.describe('GET /users/{id}/posts', { tag: '@api' }, () => {
  test('returns 200 with posts for user 1', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('GET user posts');
    await allureSeverity('normal');

    await allureStep('Send GET /users/1/posts', async () => {
      const response = await usersApi.getPosts(VALID_USER_ID);
      await attachRequestResponse('GET', '/users/1/posts', null, response);
      expect(response.status()).toBe(ApiConstants.OK);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  test('all posts for user 1 have userId=1', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('GET user posts — userId integrity');
    await allureSeverity('normal');

    await allureStep('Verify all returned posts belong to userId=1', async () => {
      const response = await usersApi.getPosts(VALID_USER_ID);
      const body = await response.json();
      for (const post of body) {
        expect(post.userId).toBe(VALID_USER_ID);
      }
    });
  });
});

test.describe('GET /users/{id}/albums', { tag: '@api' }, () => {
  test('returns 200 with albums for user 1', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('GET user albums');
    await allureSeverity('normal');

    await allureStep('Send GET /users/1/albums', async () => {
      const response = await usersApi.getAlbums(VALID_USER_ID);
      await attachRequestResponse('GET', '/users/1/albums', null, response);
      expect(response.status()).toBe(ApiConstants.OK);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  test('all albums for user 1 have userId=1', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('GET user albums — userId integrity');
    await allureSeverity('normal');

    await allureStep('Verify all returned albums belong to userId=1', async () => {
      const response = await usersApi.getAlbums(VALID_USER_ID);
      const body = await response.json();
      for (const album of body) {
        expect(album.userId).toBe(VALID_USER_ID);
      }
    });
  });
});

test.describe('POST /users', { tag: '@api' }, () => {
  test('returns 201 on successful user creation', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('POST create user — status');
    await allureSeverity('critical');

    let response!: APIResponse;

    await allureStep('Send POST /users with valid payload', async () => {
      response = await usersApi.create(NEW_USER);
      await attachRequestResponse('POST', '/users', NEW_USER, response);
    });

    await allureStep('Assert status 201', async () => {
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });

  test('created user echoes back name from payload', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('POST create user — response body');
    await allureSeverity('normal');

    await allureStep('Verify POST /users response contains sent name', async () => {
      const response = await usersApi.create(NEW_USER);
      const body = await response.json();
      expect(body.name).toBe(NEW_USER.name);
      expect(body.email).toBe(NEW_USER.email);
    });
  });
});

test.describe('PUT /users/{id}', { tag: '@api' }, () => {
  test('returns 200 on user update', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('PUT update user — status');
    await allureSeverity('critical');

    const updated = { name: 'Updated Organuz User' };
    let response!: APIResponse;

    await allureStep(`Send PUT /users/${VALID_USER_ID}`, async () => {
      response = await usersApi.update(VALID_USER_ID, updated);
      await attachRequestResponse('PUT', `/users/${VALID_USER_ID}`, updated, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });

  test('updated user reflects new name in response', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('PUT update user — name updated');
    await allureSeverity('normal');

    const newName = 'Solar Energy Tester';

    await allureStep(`Verify PUT /users/${VALID_USER_ID} reflects updated name`, async () => {
      const response = await usersApi.update(VALID_USER_ID, { name: newName });
      const body = await response.json();
      expect(body.name).toBe(newName);
    });
  });
});

test.describe('DELETE /users/{id}', { tag: '@api' }, () => {
  test('returns 200 on successful user delete', async ({ usersApi }) => {
    await allureEpic('API');
    await allureFeature('Users');
    await allureStory('DELETE user — status');
    await allureSeverity('critical');

    let response!: APIResponse;

    await allureStep(`Send DELETE /users/${VALID_USER_ID}`, async () => {
      response = await usersApi.remove(VALID_USER_ID);
      await attachRequestResponse('DELETE', `/users/${VALID_USER_ID}`, null, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });
});
