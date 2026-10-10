import type { Preview } from '@analogjs/storybook-angular';
import { storybookPreview } from '@pioneer/frontier/storybook';

import { provideRulesUiI18nTesting } from '../src/lib/testing/provide-rich-text-testing';

import './preview.css';

const preview: Preview = { ...storybookPreview(provideRulesUiI18nTesting()) };

export default preview;
