import type { Preview } from '@analogjs/storybook-angular';
import { storybookPreview } from '@pioneer/frontier/storybook';

import { provideContentUiI18nTesting } from '../src/lib/testing/provide-content-ui-testing';

import './preview.css';

const preview: Preview = { ...storybookPreview(provideContentUiI18nTesting()) };

export default preview;
