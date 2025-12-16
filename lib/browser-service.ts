import { chromium, Browser, BrowserContext } from 'playwright'
import { addExtra } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

// 添加stealth插件
const stealth = StealthPlugin()
const extra = addExtra(chromium)

class BrowserManager {
  private static instance: BrowserManager
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  private constructor() {}

  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager()
    }
    return BrowserManager.instance
  }

  public async launchBrowser(): Promise<void> {
    if (this.browser) {
      return
    }

    try {
      // 启动Chromium，持久化用户数据目录
      this.browser = await extra.launch({
        headless: false, // 方便调试，生产环境可设为true
        args: [
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
        // 持久化用户数据目录，避免每次重新登录
        userDataDir: './user_data_dir',
      })

      // 创建上下文
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })
    } catch (error) {
      console.error('Failed to launch browser:', error)
      throw error
    }
  }

  public getContext(): BrowserContext | null {
    return this.context
  }

  public getBrowser(): Browser | null {
    return this.browser
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.context = null
    }
  }

  public isRunning(): boolean {
    return this.browser !== null
  }
}

export default BrowserManager