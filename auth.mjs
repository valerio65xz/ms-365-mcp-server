import { PublicClientApplication } from '@azure/msal-node';
import keytar from 'keytar';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import logger from './logger.mjs';

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
        logger.warn(`Keychain access failed, falling back to file storage: ${keytarError.message}`);
      }

      if (!cacheData && fs.existsSync(FALLBACK_PATH)) {
        cacheData = fs.readFileSync(FALLBACK_PATH, 'utf8');
      }

      if (cacheData) {
        this.msalApp.getTokenCache().deserialize(cacheData);
      }
    } catch (error) {
      logger.error(`Error loading token cache: ${error.message}`);
    }
  }

  async saveTokenCache() {
    try {
      const cacheData = this.msalApp.getTokenCache().serialize();

      try {
        await keytar.setPassword(SERVICE_NAME, TOKEN_CACHE_ACCOUNT, cacheData);
      } catch (keytarError) {
        logger.warn(`Keychain save failed, falling back to file storage: ${keytarError.message}`);

        fs.writeFileSync(FALLBACK_PATH, cacheData);
      }
    } catch (error) {
      logger.error(`Error saving token cache: ${error.message}`);
    }
  }

  async getToken(forceRefresh = false) {
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
        logger.info('Silent token acquisition failed, using device code flow');
      }
    }

    throw new Error('No valid token found');
  }

  async acquireTokenByDeviceCode() {
    const deviceCodeRequest = {
      scopes: this.scopes,
      deviceCodeCallback: (response) => {
        // We need to show this message to the user in console
        console.log('\n' + response.message + '\n');
        logger.info('Device code login initiated');
      },
    };

    try {
      const response = await this.msalApp.acquireTokenByDeviceCode(deviceCodeRequest);
      this.accessToken = response.accessToken;
      this.tokenExpiry = new Date(response.expiresOn).getTime();
      await this.saveTokenCache();
      return this.accessToken;
    } catch (error) {
      logger.error(`Error in device code flow: ${error.message}`);
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
        logger.warn(`Keychain deletion failed: ${keytarError.message}`);
      }

      if (fs.existsSync(FALLBACK_PATH)) {
        fs.unlinkSync(FALLBACK_PATH);
      }

      return true;
    } catch (error) {
      logger.error(`Error during logout: ${error.message}`);
      throw error;
    }
  }
}

export default AuthManager;
