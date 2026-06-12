import { test, expect } from '../../src/fixtures';
import { ApiConstants } from '../../src/api/ApiConstants';
import { Album, CreateAlbumPayload, Photo } from '../../src/types/api.types';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';
import { APIResponse } from '@playwright/test';
import { attachRequestResponse } from './helpers';

const VALID_ALBUM_ID = 1;
const INVALID_ALBUM_ID = 99999;

const NEW_ALBUM: CreateAlbumPayload = {
  userId: 1,
  title: 'Organuz Test Album',
};

test.describe('GET /albums', { tag: '@api' }, () => {
  test('returns 200 with a non-empty array', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('GET all albums');
    await allureSeverity('critical');

    let response!: APIResponse;

    await allureStep('Send GET /albums', async () => {
      response = await albumsApi.getAll();
      await attachRequestResponse('GET', '/albums', null, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });

    await allureStep('Assert non-empty array', async () => {
      const body: Album[] = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  test('all albums match Album schema', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('GET all albums — schema');
    await allureSeverity('normal');

    await allureStep('Verify each album has userId, id, title', async () => {
      const response = await albumsApi.getAll();
      const body: Album[] = await response.json();
      for (const album of body.slice(0, 5)) {
        expect(album).toMatchObject({
          userId: expect.any(Number),
          id: expect.any(Number),
          title: expect.any(String),
        });
      }
    });
  });

  test('first album has id=1', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('GET all albums — first id');
    await allureSeverity('minor');

    await allureStep('Verify first album id is 1', async () => {
      const response = await albumsApi.getAll();
      const body: Album[] = await response.json();
      expect(body[0].id).toBe(1);
    });
  });
});

test.describe('GET /albums/{id}', { tag: '@api' }, () => {
  test('returns 200 for valid album id=1', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('GET album by id — valid');
    await allureSeverity('critical');

    let response!: APIResponse;
    let body!: Album;

    await allureStep(`Send GET /albums/${VALID_ALBUM_ID}`, async () => {
      const result = await albumsApi.getByIdAs(VALID_ALBUM_ID);
      response = result.response;
      body = result.body;
      await attachRequestResponse('GET', `/albums/${VALID_ALBUM_ID}`, null, response);
    });

    await allureStep('Assert status 200 and id=1', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
      expect(body.id).toBe(VALID_ALBUM_ID);
    });
  });

  test('returns 404 for non-existent album id', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('GET album by id — not found');
    await allureSeverity('normal');

    await allureStep(`GET /albums/${INVALID_ALBUM_ID} and expect 404`, async () => {
      const response = await albumsApi.getById(INVALID_ALBUM_ID);
      await attachRequestResponse('GET', `/albums/${INVALID_ALBUM_ID}`, null, response);
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });
});

test.describe('GET /albums/{id}/photos', { tag: '@api' }, () => {
  test('returns 200 with photos for album 1', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('GET album photos');
    await allureSeverity('normal');

    let response!: APIResponse;
    let body!: Photo[];

    await allureStep(`Send GET /albums/${VALID_ALBUM_ID}/photos`, async () => {
      const result = await albumsApi.getPhotosAs(VALID_ALBUM_ID);
      response = result.response;
      body = result.body;
      await attachRequestResponse('GET', `/albums/${VALID_ALBUM_ID}/photos`, null, response);
    });

    await allureStep('Assert status 200 with non-empty array', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  test('all photos for album 1 have correct schema', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('GET album photos — schema');
    await allureSeverity('normal');

    await allureStep('Verify photo fields: albumId, id, title, url, thumbnailUrl', async () => {
      const { body } = await albumsApi.getPhotosAs(VALID_ALBUM_ID);
      for (const photo of body.slice(0, 5)) {
        expect(photo).toMatchObject({
          albumId: expect.any(Number),
          id: expect.any(Number),
          title: expect.any(String),
          url: expect.any(String),
          thumbnailUrl: expect.any(String),
        });
      }
    });
  });

  test('all photos for album 1 have albumId=1', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('GET album photos — albumId integrity');
    await allureSeverity('normal');

    await allureStep('Verify all returned photos have albumId=1', async () => {
      const { body } = await albumsApi.getPhotosAs(VALID_ALBUM_ID);
      for (const photo of body) {
        expect(photo.albumId).toBe(VALID_ALBUM_ID);
      }
    });
  });
});

test.describe('POST /albums', { tag: '@api' }, () => {
  test('returns 201 on successful album creation', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('POST create album — status');
    await allureSeverity('critical');

    let response!: APIResponse;

    await allureStep('Send POST /albums with valid payload', async () => {
      response = await albumsApi.create(NEW_ALBUM);
      await attachRequestResponse('POST', '/albums', NEW_ALBUM, response);
    });

    await allureStep('Assert status 201', async () => {
      expect(response.status()).toBe(ApiConstants.CREATED);
    });
  });

  test('created album echoes back title and userId', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('POST create album — response body');
    await allureSeverity('normal');

    await allureStep('Verify POST /albums response contains sent fields', async () => {
      const response = await albumsApi.create(NEW_ALBUM);
      const body: Album = await response.json();
      expect(body.userId).toBe(NEW_ALBUM.userId);
      expect(body.title).toBe(NEW_ALBUM.title);
    });
  });
});

test.describe('PUT /albums/{id}', { tag: '@api' }, () => {
  test('returns 200 on successful album update', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('PUT update album — status');
    await allureSeverity('normal');

    const updated = { ...NEW_ALBUM, id: VALID_ALBUM_ID };
    let response!: APIResponse;

    await allureStep(`Send PUT /albums/${VALID_ALBUM_ID}`, async () => {
      response = await albumsApi.update(VALID_ALBUM_ID, updated);
      await attachRequestResponse('PUT', `/albums/${VALID_ALBUM_ID}`, updated, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });
});

test.describe('DELETE /albums/{id}', { tag: '@api' }, () => {
  test('returns 200 on successful album delete', async ({ albumsApi }) => {
    await allureEpic('API');
    await allureFeature('Albums');
    await allureStory('DELETE album — status');
    await allureSeverity('normal');

    let response!: APIResponse;

    await allureStep(`Send DELETE /albums/${VALID_ALBUM_ID}`, async () => {
      response = await albumsApi.remove(VALID_ALBUM_ID);
      await attachRequestResponse('DELETE', `/albums/${VALID_ALBUM_ID}`, null, response);
    });

    await allureStep('Assert status 200', async () => {
      expect(response.status()).toBe(ApiConstants.OK);
    });
  });
});
