import { test, expect } from '../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';
import { BlogSlugs } from '../constants';

test.describe('Blog / Knowledge Center', { tag: '@ui' }, () => {
  test.describe('Homepage blog section', () => {
    test.beforeEach(async ({ homePage }) => {
      await homePage.navigate();
      await homePage.blogSectionHeading.scrollIntoViewIfNeeded();
    });

    test('blog section heading is visible', async ({ homePage }) => {
      await allureEpic('Homepage');
      await allureFeature('Blog Section');
      await allureStory('Section heading');
      await allureSeverity('normal');

      await allureStep('Verify blog section heading is visible', async () => {
        await expect(homePage.blogSectionHeading).toBeVisible();
      });
    });

    test('all blog filter buttons are visible', async ({ homePage }) => {
      await allureEpic('Homepage');
      await allureFeature('Blog Section');
      await allureStory('Filter buttons');
      await allureSeverity('normal');

      await allureStep('Verify "הכל" filter button is visible', async () => {
        await expect(homePage.blogFilterAll).toBeVisible();
      });

      await allureStep('Verify "אנרגיה" filter button is visible', async () => {
        await expect(homePage.blogFilterEnergy).toBeVisible();
      });

      await allureStep('Verify "אחסון" filter button is visible', async () => {
        await expect(homePage.blogFilterStorage).toBeVisible();
      });

      await allureStep('Verify "אנרגיה סולארית" filter button is visible', async () => {
        await expect(homePage.blogFilterSolar).toBeVisible();
      });

      await allureStep('Verify "חשמל" filter button is visible', async () => {
        await expect(homePage.blogFilterElectricity).toBeVisible();
      });
    });

    test('clicking filter buttons does not break the page', async ({ homePage }) => {
      await allureEpic('Homepage');
      await allureFeature('Blog Section');
      await allureStory('Filter interaction');
      await allureSeverity('normal');

      await allureStep('Click "אנרגיה" filter', async () => {
        await homePage.blogFilterEnergy.click();
      });

      await allureStep('Section heading is still visible after filter click', async () => {
        await expect(homePage.blogSectionHeading).toBeVisible();
      });

      await allureStep('Click "הכל" to reset filter', async () => {
        await homePage.blogFilterAll.click();
      });

      await allureStep('Section heading is still visible after reset', async () => {
        await expect(homePage.blogSectionHeading).toBeVisible();
      });
    });

    test('"צפה בכל המאמרים" link navigates to /blog', async ({ homePage, page }) => {
      await allureEpic('Homepage');
      await allureFeature('Blog Section');
      await allureStory('View all articles CTA');
      await allureSeverity('critical');

      await allureStep('Verify "צפה בכל המאמרים" link is visible', async () => {
        await expect(homePage.viewAllBlogLink).toBeVisible();
      });

      await allureStep('Click "צפה בכל המאמרים" and verify navigation to /blog', async () => {
        await homePage.viewAllBlogLink.click();
        await expect(page).toHaveURL(/\/blog/);
      });
    });

    test('blog article read-more links are present in the homepage carousel', async ({ page }) => {
      await allureEpic('Homepage');
      await allureFeature('Blog Section');
      await allureStory('Article read-more links');
      await allureSeverity('normal');

      await allureStep('Verify at least one "למאמר" read-more link is visible', async () => {
        const readMoreLinks = page.getByRole('link', { name: /למאמר/ });
        await expect(readMoreLinks.first()).toBeVisible();
      });
    });
  });

  test.describe('Blog listing page (/blog)', () => {
    test.beforeEach(async ({ blogPage }) => {
      await blogPage.navigate();
    });

    test('blog listing page loads and shows a heading', async ({ blogPage }) => {
      await allureEpic('Blog');
      await allureFeature('Blog Listing');
      await allureStory('Page load');
      await allureSeverity('critical');

      await allureStep('Verify URL contains /blog', async () => {
        await blogPage.expectOnBlogPage();
      });

      await allureStep('Verify page heading is visible', async () => {
        await expect(blogPage.pageHeading).toBeVisible();
      });
    });
  });

  test.describe('Blog article pages', () => {
    test('energy storage article loads correctly', async ({ blogPage }) => {
      await allureEpic('Blog');
      await allureFeature('Blog Article');
      await allureStory('Energy storage article');
      await allureSeverity('normal');

      await allureStep('Navigate to energy storage article', async () => {
        await blogPage.navigateToArticle(BlogSlugs.energyStorage);
      });

      await allureStep('Verify page heading is visible', async () => {
        await expect(blogPage.pageHeading).toBeVisible();
      });

      await allureStep('Verify URL contains the article slug', async () => {
        await expect(blogPage.page).toHaveURL(new RegExp(BlogSlugs.energyStorage));
      });
    });

    test('solar forecasting article loads correctly', async ({ blogPage }) => {
      await allureEpic('Blog');
      await allureFeature('Blog Article');
      await allureStory('Solar forecasting article');
      await allureSeverity('normal');

      await allureStep('Navigate to solar forecasting article', async () => {
        await blogPage.navigateToArticle(BlogSlugs.energyEvolution);
      });

      await allureStep('Verify page heading is visible', async () => {
        await expect(blogPage.pageHeading).toBeVisible();
      });

      await allureStep('Verify URL contains the article slug', async () => {
        await expect(blogPage.page).toHaveURL(new RegExp(BlogSlugs.energyEvolution));
      });
    });

    test('electricity grid article loads correctly', async ({ blogPage }) => {
      await allureEpic('Blog');
      await allureFeature('Blog Article');
      await allureStory('Electricity grid article');
      await allureSeverity('normal');

      await allureStep('Navigate to electricity grid article', async () => {
        await blogPage.navigateToArticle(BlogSlugs.electricityGrid);
      });

      await allureStep('Verify page heading is visible', async () => {
        await expect(blogPage.pageHeading).toBeVisible();
      });

      await allureStep('Verify URL contains the article slug', async () => {
        await expect(blogPage.page).toHaveURL(new RegExp(BlogSlugs.electricityGrid));
      });
    });

    test('blog article page has a link back to the blog listing', async ({ blogPage, page }) => {
      await allureEpic('Blog');
      await allureFeature('Blog Article');
      await allureStory('Back to blog navigation');
      await allureSeverity('minor');

      await allureStep('Navigate to an article page', async () => {
        await blogPage.navigateToArticle(BlogSlugs.energyStorage);
      });

      await allureStep('Verify a link to /blog exists on the article page', async () => {
        const blogLink = page.getByRole('link', { name: /בלוג|מרכז הידע|Blog|כל המאמרים/ }).first();
        await expect(blogLink).toBeVisible();
      });
    });

    test('blog article page has paragraph content visible', async ({ blogPage, page }) => {
      await allureEpic('Blog');
      await allureFeature('Blog Article');
      await allureStory('Article content');
      await allureSeverity('normal');

      await allureStep('Navigate to an article page', async () => {
        await blogPage.navigateToArticle(BlogSlugs.energyStorage);
      });

      await allureStep('Verify article page has at least one paragraph of content', async () => {
        await expect(page.locator('p').first()).toBeVisible();
      });
    });
  });

  test.describe('Blog homepage section - additional filters', () => {
    test.beforeEach(async ({ homePage }) => {
      await homePage.navigate();
      await homePage.blogSectionHeading.scrollIntoViewIfNeeded();
    });

    test('"אחסון" filter click keeps blog section heading visible', async ({ homePage }) => {
      await allureEpic('Homepage');
      await allureFeature('Blog Section');
      await allureStory('Storage filter');
      await allureSeverity('normal');

      await allureStep('Click "אחסון" storage filter', async () => {
        await homePage.blogFilterStorage.click();
      });

      await allureStep('Verify blog section heading is still visible after filter click', async () => {
        await expect(homePage.blogSectionHeading).toBeVisible();
      });

      await allureStep('Reset to "הכל" filter', async () => {
        await homePage.blogFilterAll.click();
      });
    });

    test('"חשמל" filter click keeps blog section heading visible', async ({ homePage }) => {
      await allureEpic('Homepage');
      await allureFeature('Blog Section');
      await allureStory('Electricity filter');
      await allureSeverity('normal');

      await allureStep('Click "חשמל" electricity filter', async () => {
        await homePage.blogFilterElectricity.click();
      });

      await allureStep('Verify blog section heading is still visible after filter click', async () => {
        await expect(homePage.blogSectionHeading).toBeVisible();
      });

      await allureStep('Reset to "הכל" filter', async () => {
        await homePage.blogFilterAll.click();
      });
    });
  });
});
