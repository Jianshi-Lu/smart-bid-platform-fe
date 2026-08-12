/**
 * 带 HTTP Basic 鉴权的 SSE 订阅工具。
 *
 * 原生 EventSource 不能设置 Authorization Header；当前项目又没有 Cookie/Token
 * 会话，因此使用 fetch 读取 text/event-stream，并在连接断开后自动重连。
 */
export interface ServerSentEventMessage {
    event: string
    data: string
}

export type SseListener = (message: ServerSentEventMessage) => void

export function subscribeToSse(
    url: string,
    listener: SseListener,
): () => void {
    const authorization = getAuthorization(url)
    if (!authorization) return () => undefined

    let stopped = false
    let controller: AbortController | null = null
    let retryTimer: number | null = null

    const scheduleReconnect = () => {
        if (stopped || retryTimer !== null) return
        retryTimer = window.setTimeout(() => {
            retryTimer = null
            void connect()
        }, 3000)
    }

    const connect = async () => {
        if (stopped) return
        controller = new AbortController()
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: 'text/event-stream',
                    Authorization: authorization,
                },
                signal: controller.signal,
            })
            // SSE 规范用 204 明确要求客户端停止重连。
            if (response.status === 204) return
            if (!response.ok) {
                if (!isRetryableSseStatus(response.status)) return
                throw new Error(`SSE 连接失败: HTTP ${response.status}`)
            }
            if (!response.body) {
                throw new Error('SSE 连接失败: 响应体为空')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let eventName = 'message'
            let eventData: string[] = []

            const dispatch = () => {
                if (eventData.length > 0) {
                    listener({ event: eventName, data: eventData.join('\n') })
                }
                eventName = 'message'
                eventData = []
            }

            while (!stopped) {
                const { value, done } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const blocks = buffer.split(/\r?\n\r?\n/)
                buffer = blocks.pop() ?? ''
                for (const block of blocks) {
                    for (const line of block.split(/\r?\n/)) {
                        if (line.startsWith('event:')) {
                            eventName = line.slice(6).trim()
                        } else if (line.startsWith('data:')) {
                            eventData.push(line.slice(5).trimStart())
                        }
                    }
                    dispatch()
                }
            }
            if (!stopped) scheduleReconnect()
        } catch {
            if (!stopped) scheduleReconnect()
        }
    }

    void connect()

    return () => {
        stopped = true
        if (retryTimer !== null) {
            window.clearTimeout(retryTimer)
            retryTimer = null
        }
        controller?.abort()
        controller = null
    }
}

/** 仅对临时性 HTTP 故障重连；永久 4xx 不得形成无限请求循环。 */
export function isRetryableSseStatus(status: number): boolean {
    return status === 408
        || status === 425
        || status === 429
        || status >= 500
}

function getAuthorization(url: string): string | null {
    const storageKey = url.startsWith('/bidder')
        ? 'bidderCredentials'
        : 'bidInviterCredentials'
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null

    try {
        const credentials = JSON.parse(raw) as {
            username?: string
            password?: string
        }
        if (!credentials.username || credentials.password === undefined) {
            return null
        }
        return `Basic ${toBase64(`${credentials.username}:${credentials.password}`)}`
    } catch {
        return null
    }
}

function toBase64(value: string): string {
    const bytes = new TextEncoder().encode(value)
    let binary = ''
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
    })
    return btoa(binary)
}
