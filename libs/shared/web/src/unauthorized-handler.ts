import { InjectionToken } from '@angular/core';

/**
 * What `ApiClient` does when the server answers 401: the session ended or never existed.
 * Identity provides it (prompt sign-in); the call fails once it settles. Without one it just fails.
 */
export type UnauthorizedHandler = () => Promise<void>;

export const UNAUTHORIZED_HANDLER = new InjectionToken<UnauthorizedHandler>('UNAUTHORIZED_HANDLER');
