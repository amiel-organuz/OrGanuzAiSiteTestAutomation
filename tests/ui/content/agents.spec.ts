import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';
import { AgentNames, AgentRoles } from '../../constants';

test.describe('Agents Section', { tag: ['@ui', '@low-priority'] }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  test('"אור" agent section is visible with correct heading', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Or Agent Section');
    await allureStory('Or heading');
    await allureSeverity('critical');

    await allureStep('Scroll to Or agent section', async () => {
      await homePage.orSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify Or section heading is visible', async () => {
      await expect(homePage.orSectionHeading).toBeVisible();
    });

    await allureStep('Verify "דברו עם אור" link is visible', async () => {
      await expect(homePage.talkToOrLink).toBeVisible();
    });
  });

  test('"דברו עם אור" link points to contact section', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Or Agent Section');
    await allureStory('Talk to Or link');
    await allureSeverity('normal');

    await allureStep('Verify link href is #contact', async () => {
      await expect(homePage.talkToOrLink).toHaveAttribute('href', '#contact');
    });
  });

  test('agents section heading is visible', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Agents Section');
    await allureStory('Section heading');
    await allureSeverity('critical');

    await allureStep('Scroll to agents section', async () => {
      await homePage.agentsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify agents section heading is visible', async () => {
      await expect(homePage.agentsSectionHeading).toBeVisible();
    });
  });

  test('all six AI agents are displayed', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Agents Section');
    await allureStory('All agents visible');
    await allureSeverity('blocker');

    await allureStep('Scroll agents section into view', async () => {
      await homePage.agentsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify all 6 agent names are visible', async () => {
      await homePage.expectAllAgentsVisible();
    });
  });

  for (const agentName of AgentNames) {
    test(`agent card for ${agentName} has correct role label`, async ({ page }) => {
      await allureEpic('Homepage');
      await allureFeature('Agents Section');
      await allureStory(`Agent: ${agentName}`);
      await allureSeverity('normal');

      const role = AgentRoles[agentName as keyof typeof AgentRoles];

      await allureStep(`Scroll to ${agentName} card`, async () => {
        await page.getByRole('heading', { name: agentName }).scrollIntoViewIfNeeded();
      });

      await allureStep(`Verify agent name "${agentName}" heading is visible`, async () => {
        await expect(page.getByRole('heading', { name: agentName })).toBeVisible();
      });

      await allureStep(`Verify role label "${role}" is visible`, async () => {
        await expect(page.getByText(role)).toBeVisible();
      });
    });
  }

  test('"Why Organuz" section has 4 audience tabs', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Why Organuz Section');
    await allureStory('Audience tabs');
    await allureSeverity('normal');

    await allureStep('Scroll Why section into view', async () => {
      await homePage.whySectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify section heading is visible', async () => {
      await expect(homePage.whySectionHeading).toBeVisible();
    });

    await allureStep('Verify all 4 audience tab buttons are visible', async () => {
      await expect(homePage.whyTabPropertyOwners).toBeVisible();
      await expect(homePage.whyTabSolarCompanies).toBeVisible();
      await expect(homePage.whyTabAuthoritiesCorp).toBeVisible();
      await expect(homePage.whyTabInvestors).toBeVisible();
    });
  });

  test('clicking audience tab switches the content', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Why Organuz Section');
    await allureStory('Tab switching');
    await allureSeverity('normal');

    await allureStep('Scroll Why section into view and click "חברות סולאריות" tab', async () => {
      await homePage.whySectionHeading.scrollIntoViewIfNeeded();
      await homePage.whyTabSolarCompanies.click();
    });

    await allureStep('Verify "חברות סולאריות" tab is still visible after click', async () => {
      await expect(homePage.whyTabSolarCompanies).toBeVisible();
    });

    await allureStep('Click "משקיעים וגופי מימון" tab', async () => {
      await homePage.whyTabInvestors.click();
    });

    await allureStep('Verify "משקיעים וגופי מימון" tab is still visible after click', async () => {
      await expect(homePage.whyTabInvestors).toBeVisible();
    });
  });

  test('"Why Organuz?" — "רשויות ותאגידים" tab click keeps section stable', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Why Organuz Section');
    await allureStory('Authorities tab');
    await allureSeverity('normal');

    await allureStep('Scroll Why section into view', async () => {
      await homePage.whySectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Click "רשויות ותאגידים" tab', async () => {
      await homePage.whyTabAuthoritiesCorp.click();
    });

    await allureStep('Verify section heading is still visible after click', async () => {
      await expect(homePage.whySectionHeading).toBeVisible();
    });
  });

  test('"Why Organuz?" — "בעלי נכסים" tab click keeps section stable', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Why Organuz Section');
    await allureStory('Property owners tab');
    await allureSeverity('normal');

    await allureStep('Scroll Why section into view', async () => {
      await homePage.whySectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Click "בעלי נכסים" tab', async () => {
      await homePage.whyTabPropertyOwners.click();
    });

    await allureStep('Verify section heading is still visible after click', async () => {
      await expect(homePage.whySectionHeading).toBeVisible();
    });
  });

  test('"Why Organuz?" — cycling all 4 tabs in sequence keeps section visible', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Why Organuz Section');
    await allureStory('Tab cycle');
    await allureSeverity('normal');

    await allureStep('Scroll Why section into view', async () => {
      await homePage.whySectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Cycle through all 4 audience tabs', async () => {
      await homePage.whyTabPropertyOwners.click();
      await homePage.whyTabSolarCompanies.click();
      await homePage.whyTabAuthoritiesCorp.click();
      await homePage.whyTabInvestors.click();
    });

    await allureStep('Verify section heading is still visible after full cycle', async () => {
      await expect(homePage.whySectionHeading).toBeVisible();
    });
  });

  test('"Or" section is accessible via /#or anchor', async ({ page, homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Or Agent Section');
    await allureStory('Anchor navigation');
    await allureSeverity('minor');

    await allureStep('Navigate directly to /#or anchor', async () => {
      await page.goto('/#or');
    });

    await allureStep('Verify Or section heading is visible', async () => {
      await expect(homePage.orSectionHeading).toBeVisible();
    });
  });

  test('"Agents" section is accessible via /#agents anchor', async ({ page, homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Agents Section');
    await allureStory('Anchor navigation');
    await allureSeverity('minor');

    await allureStep('Navigate directly to /#agents anchor', async () => {
      await page.goto('/#agents');
    });

    await allureStep('Verify agents section heading is visible', async () => {
      await expect(homePage.agentsSectionHeading).toBeVisible();
    });
  });

  test('agents section contains exactly 6 AI agent name headings', async ({ page, homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Agents Section');
    await allureStory('Agent count');
    await allureSeverity('normal');

    await allureStep('Scroll agents section into view', async () => {
      await homePage.agentsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Count agent name headings — expect exactly 6', async () => {
      const agentNames = ['Solara Wattson', 'Franklin Ampere', 'Lumina Maxwell', 'Kelvin Volta', 'Edison Watts', 'Maxwell Charge'];
      for (const name of agentNames) {
        await expect(page.getByRole('heading', { name })).toBeVisible();
      }
    });
  });
});
