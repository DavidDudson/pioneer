import type { Preview } from '@analogjs/storybook-angular';
import { storybookPreview } from '@pioneer/frontier/storybook';

import { providePlayUiI18nTesting } from '../src/lib/testing/provide-play-ui-testing';

import './preview.css';

const preview: Preview = { ...storybookPreview(providePlayUiI18nTesting()) };

export default preview;
