import type { Preview } from '@analogjs/storybook-angular';
import { storybookPreview } from '@pioneer/frontier/storybook';

import { provideLegalUiI18nTesting } from '../src/lib/testing/provide-legal-ui-testing';

import './preview.css';

const preview: Preview = { ...storybookPreview(provideLegalUiI18nTesting()) };

export default preview;
