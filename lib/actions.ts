import { prisma } from '@/lib/prisma'
import BrowserManager from '@/lib/browser-service'
import * as nodejieba from 'nodejieba'
import fs from 'fs'
import path from 'path'
import { OpenAI } from 'openai'

const bannedWords = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'lib', 'banned_words.json'), 'utf8')
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

const MODEL = process.env.OPENAI_MODEL_NAME || 'gpt-4-turbo'

export async function scrapeTrends(keyword: string) {
  let tempContext: any = null
  
  try {
    const taskLog = await prisma.taskLog.create({
      data: {
        type: 'trend',
        status: 'running',
        details: `Scraping trends for keyword: ${keyword}`
      }
    })

    const browserManager = BrowserManager.getInstance()
    
    let context = browserManager.getContext()
    
    if (!context) {
      if (!browserManager.hasSavedCookies()) {
        throw new Error('Browser not running and no saved cookies found. Please launch the browser first from the dashboard.')
      }
      
      tempContext = await browserManager.createTemporaryContext()
      if (!tempContext) {
        throw new Error('Failed to create temporary context with saved cookies.')
      }
      
      context = tempContext
    }

    if (!context) {
      throw new Error('Browser context not available')
    }

    const page = await context.newPage()
    
    try {
      const encodedKeyword = encodeURIComponent(keyword)
      const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodedKeyword}&source=unknown`
      
      await page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      })

      await page.waitForTimeout(3000)

      const noteElements = await page.$$('[class*="feed-item"], [class*="note"], article, [class*="note_item"]')
      const results: Array<{ title: string; likes: number; url: string; createdAt?: Date; pageTitle?: string; comments?: string[] }> = []
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      for (let i = 0; i < Math.min(noteElements.length, 100); i++) {
        try {
          const element = noteElements[i]
          
          const titleText = await element.$eval(
            '[class*="title"], h1, h2, h3, [class*="desc"], span',
            el => (el as HTMLElement).innerText
          ).catch(() => ``)
          
          if (!titleText || titleText.length === 0) continue

          const likeText = await element.$eval(
            '[class*="like"], [class*="praise"], [class*="count"]',
            el => (el as HTMLElement).innerText
          ).catch(() => '0')
          
          const likes = parseInt(likeText.replace(/[^\d]/g, '')) || 0
          
          const noteLink = await element.$eval('a', el => 
            (el as HTMLAnchorElement).href
          ).catch(() => null)

          if (!noteLink) continue

          const dateText = await element.$eval(
            '[class*="date"], [class*="time"], span',
            el => (el as HTMLElement).innerText
          ).catch(() => '')

          let createdAt = new Date()
          if (dateText) {
            createdAt = parseXHSDate(dateText)
          }

          const fullUrl = noteLink.startsWith('http') ? noteLink : `https://www.xiaohongshu.com${noteLink}`
          
          let pageTitle = ''
          let comments: string[] = []
          
          try {
            const notePage = await context.newPage()
            await notePage.goto(fullUrl, { 
              waitUntil: 'domcontentloaded',
              timeout: 15000 
            })
            await notePage.waitForTimeout(2000)
            
            const extractedData = await notePage.evaluate(() => {
              const title = document.title || document.querySelector('meta[property="og:title"]')?.getAttribute('content') || ''
              
              const commentElements = document.querySelectorAll('[class*="comment"], [class*="reply"], .comment-item')
              const extractedComments: string[] = []
              
              commentElements.forEach((el) => {
                const text = el.textContent?.trim() || ''
                if (text && text.length > 0 && text.length < 500) {
                  extractedComments.push(text)
                }
              })
              
              return {
                title,
                comments: extractedComments.slice(0, 50)
              }
            })
            
            pageTitle = extractedData.title
            comments = extractedData.comments
            
            await notePage.close()
          } catch (error) {
            console.warn(`Failed to extract comments from ${fullUrl}:`, error)
          }

          results.push({
            title: titleText.substring(0, 200),
            likes,
            url: fullUrl,
            createdAt,
            pageTitle,
            comments
          })

          await prisma.trendData.create({
            data: {
              keyword,
              title: titleText.substring(0, 200),
              likes,
              url: fullUrl,
              comments: comments.length > 0 ? JSON.stringify(comments) : null
            }
          })
        } catch (error) {
          console.warn(`Failed to extract note ${i}:`, error)
        }
      }

      if (results.length === 0) {
        throw new Error(`No notes found for keyword: ${keyword}. May need login or keyword not exist.`)
      }

      const threeMonthsAgoDate = new Date()
      threeMonthsAgoDate.setMonth(threeMonthsAgoDate.getMonth() - 3)

      const recentResults = results.filter(r => r.createdAt && r.createdAt >= threeMonthsAgoDate)
      const sortedResults = recentResults.length > 0 ? recentResults : results

      sortedResults.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          const dateDiff = b.createdAt.getTime() - a.createdAt.getTime()
          if (dateDiff !== 0) return dateDiff
        }
        return b.likes - a.likes
      })

      const allText = sortedResults.map(r => r.title).join(' ')
      const words = nodejieba.cut(allText)
      const wordCount: Record<string, number> = {}
      
      words.forEach(word => {
        if (word.length > 1) {
          wordCount[word] = (wordCount[word] || 0) + 1
        }
      })

      const topWords = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)

      await prisma.taskLog.update({
        where: { id: taskLog.id },
        data: {
          status: 'completed',
          result: JSON.stringify({ 
            results: sortedResults.slice(0, 20),
            topWords,
            keyword,
            count: sortedResults.length,
            totalAnalyzed: results.length
          })
        }
      })

      return { results: sortedResults.slice(0, 20), topWords }
    } finally {
      await page.close()
      if (tempContext) {
        await tempContext.close()
      }
    }
  } catch (error) {
    console.error('Error scraping trends:', error)
    if (tempContext) {
      try {
        await tempContext.close()
      } catch (e) {
        console.error('Failed to close temporary context:', e)
      }
    }
    const taskLog = await prisma.taskLog.findFirst({
      where: { type: 'trend', status: 'running' },
      orderBy: { createdAt: 'desc' }
    })
    
    if (taskLog) {
      await prisma.taskLog.update({
        where: { id: taskLog.id },
        data: { status: 'failed', result: JSON.stringify({ error: String(error) }) }
      })
    }
    
    throw error
  }
}

function parseXHSDate(dateText: string): Date {
  const now = new Date()
  const text = dateText.trim().toLowerCase()

  if (text.includes('刚刚')) return now
  
  const minuteMatch = text.match(/(\d+)分钟/)
  if (minuteMatch) {
    const date = new Date(now)
    date.setMinutes(date.getMinutes() - parseInt(minuteMatch[1]))
    return date
  }

  const hourMatch = text.match(/(\d+)小时/)
  if (hourMatch) {
    const date = new Date(now)
    date.setHours(date.getHours() - parseInt(hourMatch[1]))
    return date
  }

  const dayMatch = text.match(/(\d+)天/)
  if (dayMatch) {
    const date = new Date(now)
    date.setDate(date.getDate() - parseInt(dayMatch[1]))
    return date
  }

  const weekMatch = text.match(/(\d+)周/)
  if (weekMatch) {
    const date = new Date(now)
    date.setDate(date.getDate() - parseInt(weekMatch[1]) * 7)
    return date
  }

  const monthMatch = text.match(/(\d+)月/)
  if (monthMatch) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - parseInt(monthMatch[1]))
    return date
  }

  const dateMatch = text.match(/(\d{1,2})-(\d{1,2})/)
  if (dateMatch) {
    const date = new Date(now)
    date.setMonth(parseInt(dateMatch[1]) - 1)
    date.setDate(parseInt(dateMatch[2]))
    if (date > now) date.setFullYear(date.getFullYear() - 1)
    return date
  }

  return now
}

export async function checkCompliance(text: string) {
  try {
    const foundBannedWords: string[] = []
    bannedWords.forEach((word: string) => {
      if (text.includes(word)) {
        foundBannedWords.push(word)
      }
    })

    let aiReview = {
      isCompliant: true,
      suggestions: [] as string[]
    }

    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一个中国广告法合规专家。请审核以下小红书文案是否符合法规要求，特别是关于广告用语、虚假宣传等方面。'
          },
          {
            role: 'user',
            content: `请审核这段小红书文案的合规性：\n\n${text}\n\n返回JSON格式：{"isCompliant": boolean, "suggestions": [string]}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })

      const content = response.choices[0]?.message?.content || ''
      try {
        const parsed = JSON.parse(content)
        aiReview = {
          isCompliant: parsed.isCompliant !== false,
          suggestions: parsed.suggestions || []
        }
      } catch {
        aiReview.suggestions = [content]
      }
    } catch (error) {
      console.warn('OpenAI API call failed:', error)
      aiReview.suggestions = ['无法进行AI审核，请检查API配置']
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

export async function generateComment(noteText: string) {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个小红书用户，会写短小精悍、有趣且真诚的评论。评论长度控制在50字以内。'
        },
        {
          role: 'user',
          content: `请为这篇小红书笔记写一条真诚的评论：\n\n${noteText.substring(0, 500)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    })

    return response.choices[0]?.message?.content || '这篇笔记很有帮助！'
  } catch (error) {
    console.error('Error generating comment:', error)
    const fallbackComments = [
      '这篇笔记很有帮助，感谢分享！',
      '内容很实用，学到了很多！',
      '写得很详细，点赞支持！',
      '感谢分享这么好的内容！',
      '很有启发性，期待更多！'
    ]
    return fallbackComments[Math.floor(Math.random() * fallbackComments.length)]
  }
}

export async function executeInteract(noteUrl: string, comment: string) {
  try {
    const browserManager = BrowserManager.getInstance()
    const context = browserManager.getContext()
    
    if (!context) {
      throw new Error('Browser not launched')
    }

    const page = await context.newPage()
    
    try {
      await page.goto(noteUrl, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)

      const commentBox = await page.$('[class*="comment"], textarea, [contenteditable="true"]')
      
      if (commentBox) {
        await commentBox.click()
        await page.keyboard.type(comment, { delay: 50 })
        
        const submitBtn = await page.$('button[type="submit"], [class*="send"], [class*="submit"]')
        if (submitBtn) {
          await submitBtn.click()
          await page.waitForTimeout(2000)
        }
      }

      return { success: true, message: 'Interaction executed successfully' }
    } finally {
      await page.close()
    }
  } catch (error) {
    console.error('Error executing interaction:', error)
    throw error
  }
}

export async function generatePost(keyword: string, comments: string[], topWords: Array<[string, number]>) {
  try {
    const commentsSummary = comments
      .filter(c => c && c.length > 0)
      .slice(0, 30)
      .join('\n')
    
    const topWordsStr = topWords
      .map(([word, count]) => `${word}(${count}次)`)
      .join(', ')

    const systemPrompt = `你是一个专业的小红书内容创作者。你需要根据热点评论和热词，生成一篇容易引起讨论和互动的小红书笔记内容。

要求：
1. 内容应该引发人们的讨论和评论
2. 文案要精炼、有趣、有代入感
3. 长度控制在200-500字左右
4. 使用合适的emoji和换行符使内容更有吸引力
5. 内容应该围绕关键词"${keyword}"展开
6. 避免虚假宣传和违法内容
7. 最后可以加上适当的话题标签和互动问题来引发评论

生成的内容应该能够引起用户共鸣和讨论。`

    const userPrompt = `请根据以下热点评论和热词，生成一篇能引发讨论的小红书笔记：

【热点关键词】
${topWordsStr}

【热点评论摘要】
${commentsSummary || '未获取到评论数据，请基于关键词创意生成'}

请生成一篇能够吸引用户互动和讨论的小红书笔记内容。`

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1000
    })

    const generatedContent = response.choices[0]?.message?.content || ''

    const post = await prisma.generatedPost.create({
      data: {
        keyword,
        content: generatedContent,
        sourceComments: comments.length > 0 ? JSON.stringify(comments.slice(0, 30)) : null
      }
    })

    return {
      id: post.id,
      content: generatedContent,
      keyword,
      generatedAt: post.generatedAt
    }
  } catch (error) {
    console.error('Error generating post:', error)
    throw error
  }
}

export async function publishPostToXHS(postId: number, content: string) {
  try {
    const browserManager = BrowserManager.getInstance()
    let context = browserManager.getContext()
    let tempContext: any = null

    if (!context) {
      if (!browserManager.hasSavedCookies()) {
        throw new Error('浏览器未运行，请先在概览页面启动浏览器并登录')
      }
      
      tempContext = await browserManager.createTemporaryContext()
      if (!tempContext) {
        throw new Error('无法使用保存的登录信息，请重新启动浏览器')
      }
      
      context = tempContext
    }

    if (!context) {
      throw new Error('Browser context not available')
    }

    const page = await context.newPage()
    
    try {
      await page.goto('https://creator.xiaohongshu.com/publish/publish?source=official&from=menu&target=article', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      
      await page.waitForTimeout(3000)

      const textInput = await page.$('textarea, [contenteditable="true"]')
      if (!textInput) {
        throw new Error('找不到发布文本框，请手动发布')
      }

      await textInput.click()
      await page.keyboard.type(content, { delay: 30 })
      
      await page.waitForTimeout(1000)

      const publishBtn = await page.$('button[type="button"]:has-text("发布"), button:has-text("发表"), button[class*="publish"], .ant-btn-primary')
      
      if (publishBtn) {
        await publishBtn.click()
        await page.waitForTimeout(3000)
        
        const success = await page.evaluate(() => {
          const successMsg = document.body.innerText.includes('成功') || 
                            document.body.innerText.includes('已发布') ||
                            document.body.innerText.includes('完成') ||
                            window.location.href.includes('feed') ||
                            window.location.href.includes('detail')
          return successMsg
        })

        if (success) {
          await prisma.generatedPost.update({
            where: { id: postId },
            data: { 
              keyword: (await prisma.generatedPost.findUnique({ where: { id: postId } }))?.keyword || '',
              content,
              sourceComments: null
            }
          })
          
          return {
            success: true,
            message: '帖子发布成功！',
            postId
          }
        } else {
          return {
            success: false,
            message: '发布可能失败，请检查小红书页面',
            postId
          }
        }
      } else {
        throw new Error('找不到发布按钮')
      }
    } finally {
      await page.close()
      if (tempContext) {
        await tempContext.close()
      }
    }
  } catch (error) {
    console.error('Error publishing post to XHS:', error)
    throw error
  }
}