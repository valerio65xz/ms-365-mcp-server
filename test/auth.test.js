import { describe, expect, it, vi } from 'vitest';
import { PublicClientApplication } from '@azure/msal-node';
import AuthManager from '../auth.mjs';
vi.mock('@azure/msal-node', () => {
  return {
    PublicClientApplication: vi.fn().mockImplementation(() => ({
      getTokenCache: vi.fn().mockReturnValue({
        deserialize: vi.fn(),
        serialize: vi.fn(),
        getAllAccounts: vi.fn(),
        removeAccount: vi.fn(),
      }),
      acquireTokenSilent: vi.fn(),
      acquireTokenByDeviceCode: vi.fn(),
    })),
  };
});

vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

describe('AuthManager', () => {
  it('should initialize properly', () => {
    const authManager = new AuthManager();
    expect(authManager).toBeDefined();
    expect(PublicClientApplication).toHaveBeenCalled();
  });
});
