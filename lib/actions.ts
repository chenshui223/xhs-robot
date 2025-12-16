import { prisma } from '@/lib/prisma'
import BrowserManager from '@/lib/browser-service'
import * as nodejieba from 'nodejieba'
import fs from 'fs'
import path from 'path'

// 加载违禁词列表
const bannedWords = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'lib', 'banned_words.json'), 'utf8')
)

// 热点抓取功能
export async function scrapeTrends(keyword: string) {
  try {
    // 创建任务日志
    const taskLog = await prisma.taskLog.create({
      data: {
        type: 'trend',
        status: 'running',
        details: `Scraping trends for keyword: ${keyword}`
      }
    })

    const browserManager = BrowserManager.getInstance()
    const context = browserManager.getContext()
    
    if (!context) {
      throw new Error('Browser not launched')
    }

    const page = await context.newPage()
    
    // 访问小红书搜索页（这里使用模拟数据，实际需要根据小红书页面结构调整）
    // 注意：实际的小红书爬虫需要处理反爬机制和登录状态
    const mockResults = [
      { title: `关于${keyword}的热门笔记1`, likes: 1234, url: 'https://xhs.com/note1' },
      { title: `关于${keyword}的热门笔记2`, likes: 987, url: 'https://xhs.com/note2' },
      { title: `关于${keyword}的热门笔记3`, likes: 2345, url: 'https://xhs.com/note3' },
      { title: `关于${keyword}的热门笔记4`, likes: 567, url: 'https://xhs.com/note4' },
      { title: `关于${keyword}的热门笔记5`, likes: 3456, url: 'https://xhs.com/note5' },
    ]

    // 保存热点数据到数据库
    for (const result of mockResults) {
      await prisma.trendData.create({
        data: {
          keyword,
          title: result.title,
          likes: result.likes,
          url: result.url
        }
      })
    }

    // 中文分词统计热词
    const allText = mockResults.map(r => r.title).join(' ')
    const words = nodejieba.cut(allText)
    const wordCount: Record<string, number> = {}
    
    words.forEach(word => {
      if (word.length > 1) {
        wordCount[word] = (wordCount[word] || 0) + 1
      }
    })

    // 获取Top 10热词
    const topWords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)

    await prisma.taskLog.update({
      where: { id: taskLog.id },
      data: {
        status: 'completed',
        result: JSON.stringify({ 
          results: mockResults, 
          topWords 
        })
      }
    })

    return { results: mockResults, topWords }
  } catch (error) {
    console.error('Error scraping trends:', error)
    // 更新任务状态为失败
    const taskLog = await prisma.taskLog.findFirst({
      where: { type: 'trend', status: 'running' },
      orderBy: { createdAt: 'desc' }
    })
    
    if (taskLog) {
      await prisma.taskLog.update({
        where: { id: taskLog.id },
        data: { status: 'failed', result: JSON.stringify({ error: error.message }) }
      })
    }
    
    throw error
  }
}

// 合规检测功能
export async function checkCompliance(text: string) {
  try {
    // 第一步：本地正则匹配违禁词
    const foundBannedWords: string[] = []
    bannedWords.forEach((word: string) => {
      if (text.includes(word)) {
        foundBannedWords.push(word)
      }
    })

    // 第二步：调用AI进行语义审核（这里模拟AI审核结果）
    // 实际应用中应该调用Anthropic SDK
    const aiReview = {
      isCompliant: foundBannedWords.length === 0,
      suggestions: foundBannedWords.length > 0 
        ? ['建议修改违禁词，避免违反广告法'] 
        : ['文案合规，可以发布']
    }

    return {
      localCheck: {
        isCompliant: foundBannedWords.length === 0,
        bannedWords: foundBannedWords
      },
      aiReview
    }
  } catch (error) {
    console.error('Error checking compliance:', error)
    throw error
  }
}

// AI评论生成功能
export async function generateComment(noteText: string) {
  try {
    // 这里模拟AI生成评论
    // 实际应用中应该调用Claude API
    const comments = [
      '这篇笔记很有帮助，感谢分享！',
      '内容很实用，学到了很多！',
      '写得很详细，点赞支持！',
      '感谢分享这么好的内容！',
      '很有启发性的内容，期待更多！'
    ]
    
    const randomComment = comments[Math.floor(Math.random() * comments.length)]
    return randomComment
  } catch (error) {
    console.error('Error generating comment:', error)
    throw error
  }
}

// 浏览器交互执行功能
export async function executeInteract(noteUrl: string, comment: string) {
  try {
    const browserManager = BrowserManager.getInstance()
    const context = browserManager.getContext()
    
    if (!context) {
      throw new Error('Browser not launched')
    }

    const page = await context.newPage()
    await page.goto(noteUrl)
    
    // 模拟滚动、点击、粘贴评论的操作
    // 实际实现需要根据小红书页面结构进行调整
    await page.waitForTimeout(2000) // 等待页面加载
    
    // 这里是模拟操作，实际需要定位评论框元素
    console.log(`Executing interaction on ${noteUrl} with comment: ${comment}`)
    
    return { success: true, message: 'Interaction executed successfully' }
  } catch (error) {
    console.error('Error executing interaction:', error)
    throw error
  }
}