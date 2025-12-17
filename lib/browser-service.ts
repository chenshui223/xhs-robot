import { chromium, Browser, BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";

class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | BrowserContext | null = null;
  private context: BrowserContext | null = null;
  private userDataDir: string;

  private constructor() {
    const userDataDir =
      process.env.XHS_BROWSER_USER_DATA_DIR || "./browser-user-data";
    this.userDataDir = path.resolve(process.cwd(), userDataDir);

    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }
  }

  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  public async launchBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }

    try {
      const headless = process.env.XHS_HEADLESS === "true";

      this.browser = await chromium.launch({
        headless: headless,
        args: [
          "--disable-web-security",
          "--disable-features=IsolateOrigins,site-per-process",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      this.context = await (this.browser as Browser).newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        storageState: this.getStorageStatePath(),
      });

      const stored = this.loadStorageState();
      if (stored) {
        await this.context.addCookies(stored.cookies || []);
      }
    } catch (error) {
      console.error("Failed to launch browser:", error);
      throw error;
    }
  }

  public async launchBrowserWithUserDataDir(): Promise<void> {
    if (this.browser) {
      return;
    }

    try {
      const headless = process.env.XHS_HEADLESS === "true";

      this.context = await chromium.launchPersistentContext(this.userDataDir, {
        headless: headless,
        viewport: { width: 1920, height: 1080 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        args: [
          "--disable-web-security",
          "--disable-features=IsolateOrigins,site-per-process",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      this.browser = this.context;

      await this.openLoginPage();
    } catch (error) {
      console.error("Failed to launch persistent browser:", error);
      throw error;
    }
  }

  public async openLoginPage(): Promise<void> {
    if (!this.context) return;

    try {
      const page = await this.context.newPage();
      await page.goto("https://www.xiaohongshu.com/explore", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
      await page.close();
    } catch (error) {
      console.error("Failed to open login page:", error);
    }
  }

  public async checkLoginStatus(): Promise<boolean> {
    if (!this.context) return false;

    try {
      const page = await this.context.newPage();
      await page.goto("https://www.xiaohongshu.com/explore", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      
      const isLoggedIn = await page.evaluate(() => {
        const userMenuXPath = "//div[contains(@class, 'user') or contains(@class, 'profile') or contains(@class, 'avatar')]";
        const userElement = document.evaluate(userMenuXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        
        const loginButtonXPath = "//button[contains(text(), '登录') or contains(text(), 'Login')]";
        const loginButton = document.evaluate(loginButtonXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        
        const userMenuByClass = document.querySelector('[class*="user"], [class*="avatar"], [class*="profile"]');
        
        return !!(userElement || userMenuByClass) || !loginButton;
      });

      await page.close();
      return isLoggedIn;
    } catch (error) {
      console.error("Failed to check login status:", error);
      return false;
    }
  }

  public getContext(): BrowserContext | null {
    return this.context;
  }

  public getBrowser(): Browser | BrowserContext | null {
    return this.browser;
  }

  public async close(): Promise<void> {
    if (this.context) {
      try {
        const cookies = await this.context.cookies();
        this.saveStorageState({ cookies });
      } catch (error) {
        console.error("Failed to save cookies:", error);
      }
    }

    if (this.browser) {
      if ("close" in this.browser) {
        await this.browser.close();
      }
      this.browser = null;
      this.context = null;
    }
  }

  public isRunning(): boolean {
    return this.browser !== null && this.context !== null;
  }

  public hasSavedCookies(): boolean {
    const statePath = this.getStorageStatePath();
    return fs.existsSync(statePath);
  }

  public async createTemporaryContext(): Promise<BrowserContext | null> {
    try {
      const stored = this.loadStorageState();
      if (!stored || !stored.cookies || stored.cookies.length === 0) {
        return null;
      }

      const tempContext = await chromium.launchPersistentContext(this.userDataDir, {
        headless: true,
        viewport: { width: 1920, height: 1080 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        args: [
          "--disable-web-security",
          "--disable-features=IsolateOrigins,site-per-process",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      return tempContext;
    } catch (error) {
      console.error("Failed to create temporary context:", error);
      return null;
    }
  }

  private getStorageStatePath(): string {
    return path.join(this.userDataDir, "storage-state.json");
  }

  private loadStorageState(): any {
    const statePath = this.getStorageStatePath();
    try {
      if (fs.existsSync(statePath)) {
        return JSON.parse(fs.readFileSync(statePath, "utf8"));
      }
    } catch (error) {
      console.warn("Failed to load storage state:", error);
    }
    return null;
  }

  private saveStorageState(state: any): void {
    const statePath = this.getStorageStatePath();
    try {
      const stateWithMetadata = {
        ...state,
        savedAt: new Date().toISOString(),
        cookies: (state.cookies || []).map((cookie: any) => ({
          ...cookie,
          expires: cookie.expires || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
        }))
      };
      fs.writeFileSync(statePath, JSON.stringify(stateWithMetadata, null, 2));
    } catch (error) {
      console.warn("Failed to save storage state:", error);
    }
  }

  public async saveCookies(accountId: string): Promise<void> {
    if (!this.context) return;

    try {
      const cookies = await this.context.cookies();
      const cookiesWithExtendedExpiry = cookies.map((cookie: any) => ({
        ...cookie,
        expires: cookie.expires || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
      }));
      const cookiesPath = path.join(
        this.userDataDir,
        `cookies-${accountId}.json`
      );
      fs.writeFileSync(cookiesPath, JSON.stringify(cookiesWithExtendedExpiry, null, 2));
    } catch (error) {
      console.error("Failed to save cookies:", error);
    }
  }

  public async loadCookies(accountId: string): Promise<void> {
    if (!this.context) return;

    try {
      const cookiesPath = path.join(
        this.userDataDir,
        `cookies-${accountId}.json`
      );
      if (fs.existsSync(cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath, "utf8"));
        await this.context.addCookies(cookies);
      }
    } catch (error) {
      console.error("Failed to load cookies:", error);
    }
  }
}

export default BrowserManager;
