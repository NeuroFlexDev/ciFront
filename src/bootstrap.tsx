import { businessEnglish } from '@/i18n/business';
import { aiControlEnglish } from '@/i18n/aiControl';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/auth/AuthContext';
import { AppErrorBoundary } from '@/Components/AppErrorBoundary';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { integrationsEnglish } from '@/i18n/integrations';
import { publicationEnglish } from '@/i18n/publication';
import { materialsEnglish } from '@/i18n/materials';
import { globalEnglish } from '@/i18n/global';
import { publicEnglish } from '@/i18n/public';
import { adminEditorEnglish } from '@/i18n/adminEditor';
import { tenantLifecycleEnglish } from '@/i18n/tenantLifecycle';
import { canvasEnglish } from '@/i18n/canvas';
import { creatorEnglish } from '@/i18n/creator';
import { generationEnglish } from '@/i18n/generation';

export function renderApplication(application: ReactNode) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <LocaleProvider
        dictionaries={{
          en: {
            ...globalEnglish,
            ...businessEnglish,
            ...aiControlEnglish,
            ...integrationsEnglish,
            ...publicationEnglish,
            ...materialsEnglish,
            ...adminEditorEnglish,
            ...tenantLifecycleEnglish,
            ...publicEnglish,
            ...canvasEnglish,
            ...creatorEnglish,
            ...generationEnglish,
          },
        }}
      >
        <AppErrorBoundary>
          <AuthProvider>{application}</AuthProvider>
        </AppErrorBoundary>
      </LocaleProvider>
    </StrictMode>,
  );
}
