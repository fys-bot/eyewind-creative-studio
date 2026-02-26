
import { en } from '../locales/en';
import { zh } from '../locales/zh';
import { tw } from '../locales/tw';

import { adminEn } from '../locales/admin/en';
import { adminZh } from '../locales/admin/zh';
import { adminTw } from '../locales/admin/tw';

export const translations = {
  en,
  zh,
  tw
};

export const adminTranslations = {
  en: adminEn,
  zh: adminZh,
  tw: adminTw
};

export type Language = keyof typeof translations;
