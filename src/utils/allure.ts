import {
  label,
  link,
  epic,
  feature,
  story,
  severity,
  step as allureJsStep,
  attachment,
  description,
  owner,
} from 'allure-js-commons';
import { test } from '@playwright/test';
import { logger } from './logger';
import type { Severity } from '../types/allure.types';

export type { Severity } from '../types/allure.types';

export const allureSeverity  = (s: Severity) => severity(s);
export const allureEpic      = (name: string) => epic(name);
export const allureFeature   = (name: string) => feature(name);
export const allureStory     = (name: string) => story(name);
export const allureDescription = (text: string) => description(text);
export const allureOwner     = (name: string) => owner(name);
export const allureLabel     = (name: string, value: string) => label(name, value);

export const allureAttachment = (
  name: string,
  content: string | Buffer,
  type: string = 'text/plain',
) => attachment(name, content as string, { contentType: type });

export const allureStep = <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  logger.step(name);
  return test.step(name, () =>
    Promise.resolve(allureJsStep(name, fn))
      .then(result => { logger.pass(name); return result; })
      .catch(err   => { logger.fail(name, err); throw err; }),
  );
};

export const allureLink        = (url: string, name?: string, type?: string) => link(url, name, type);
export const allureRequirement = (url: string, name?: string) => link(url, name ?? url, 'tms');
export const allureBug         = (url: string, name?: string) => link(url, name ?? url, 'issue');
