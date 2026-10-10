import type { Preview } from '@analogjs/storybook-angular';

import { provideFrontierI18nTesting } from '../src/lib/testing/provide-frontier-i18n-testing';
import { storybookPreview } from '../src/storybook';

import '../src/styles/frontier.css';

const preview: Preview = { ...storybookPreview(provideFrontierI18nTesting()) };

export default preview;
