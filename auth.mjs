import { PublicClientApplication } from '@azure/msal-node';
import keytar from 'keytar';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const SERVICE_NAME = 'ms-365-mcp-server';
const TOKEN_CACHE_ACCOUNT = 'msal-token-cache';
const FALLBACK_DIR = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_PATH = path.join(FALLBACK_DIR, '.token-cache.json');

const DEFAULT_CONFIG = {
  auth: {
    clientId: '084a3e9f-a9f4-43f7-89f9-d229cf97853e',
    authority: 'https://login.microsoftonline.com/common',
  },
};

const DEFAULT_SCOPES = [
  'Files.ReadWrite',
  'Files.ReadWrite.All',
  'Sites.ReadWrite.All',
  'User.Read',
  'User.ReadBasic.All',
];

class AuthManager {
  constructor(config = DEFAULT_CONFIG, scopes = DEFAULT_SCOPES) {
    this.config = config;
    this.scopes = scopes;
    this.msalApp = new PublicClientApplication(this.config);
    this.accessToken = null;
    this.tokenExpiry = null;

    this.loadTokenCache();
  }

  async loadTokenCache() {
    try {
      let cacheData;

      try {
        const cachedData = await keytar.getPassword(SERVICE_NAME, TOKEN_CACHE_ACCOUNT);
        if (cachedData) {
          cacheData = cachedData;
        }
      } catch (keytarError) {
        process.stderr.write(
          `Keychain access failed, falling back to file storage: ${keytarError.message}\n`
        );
      }

      if (!cacheData && fs.existsSync(FALLBACK_PATH)) {
        cacheData = fs.readFileSync(FALLBACK_PATH, 'utf8');
      }

      if (cacheData) {
        this.msalApp.getTokenCache().deserialize(cacheData);
      }
    } catch (error) {
      process.stderr.write(`Error loading token cache: ${error.message}\n`);
    }
  }

  async saveTokenCache() {
    try {
      const cacheData = this.msalApp.getTokenCache().serialize();

      try {
        await keytar.setPassword(SERVICE_NAME, TOKEN_CACHE_ACCOUNT, cacheData);
      } catch (keytarError) {
        process.stderr.write(
          `Keychain save failed, falling back to file storage: ${keytarError.message}\n`
        );

        fs.writeFileSync(FALLBACK_PATH, cacheData);
      }
    } catch (error) {
      process.stderr.write(`Error saving token cache: ${error.message}\n`);
    }
  }

  async getToken(forceRefresh = false) {
    try {
      if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now() && !forceRefresh) {
        return this.accessToken;
      }

      const accounts = await this.msalApp.getTokenCache().getAllAccounts();

      if (accounts.length > 0) {
        const silentRequest = {
          account: accounts[0],
          scopes: this.scopes,
        };

        try {
          const response = await this.msalApp.acquireTokenSilent(silentRequest);
          this.accessToken = response.accessToken;
          this.tokenExpiry = new Date(response.expiresOn).getTime();
          return this.accessToken;
        } catch (error) {
          process.stderr.write('Silent token acquisition failed, using device code flow\n');
        }
      }

      return await this.acquireTokenByDeviceCode();
    } catch (error) {
      process.stderr.write(`Error getting token: ${error.message}\n`);
      throw error;
    }
  }

  async acquireTokenByDeviceCode() {
    const deviceCodeRequest = {
      scopes: this.scopes,
      deviceCodeCallback: (response) => {
        process.stderr.write('\n' + response.message + '\n');
      },
    };

    try {
      const response = await this.msalApp.acquireTokenByDeviceCode(deviceCodeRequest);
      this.accessToken = response.accessToken;
      this.tokenExpiry = new Date(response.expiresOn).getTime();
      await this.saveTokenCache();
      return this.accessToken;
    } catch (error) {
      process.stderr.write(`Error in device code flow: ${error.message}\n`);
      throw error;
    }
  }

  async logout() {
    try {
      const accounts = await this.msalApp.getTokenCache().getAllAccounts();
      for (const account of accounts) {
        await this.msalApp.getTokenCache().removeAccount(account);
      }
      this.accessToken = null;
      this.tokenExpiry = null;

      try {
        await keytar.deletePassword(SERVICE_NAME, TOKEN_CACHE_ACCOUNT);
      } catch (keytarError) {
        process.stderr.write(`Keychain deletion failed: ${keytarError.message}\n`);
      }

      if (fs.existsSync(FALLBACK_PATH)) {
        fs.unlinkSync(FALLBACK_PATH);
      }

      return true;
    } catch (error) {
      process.stderr.write(`Error during logout: ${error.message}\n`);
      throw error;
    }
  }
}

export default AuthManager;
