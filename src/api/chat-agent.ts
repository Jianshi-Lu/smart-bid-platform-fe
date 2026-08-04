/**
 * chat-agent 单轮问答 API。
 *
 * 前端只调用 Java 的 /chat-agent/chat；Python 服务地址由 Java 后端配置，
 * 浏览器不直接连接 Python。
 */
import { http } from '@/api/http'
import type { Result } from '@/types/common'
import type { ChatRequest, ChatResponse } from '@/types/chat-agent'

/** POST /chat-agent/chat，提交一个问题并返回回答。 */
export function askChatAgent(question: string): Promise<ChatResponse> {
    const data: ChatRequest = { question }

    return http
        .post<Result<ChatResponse>>('/chat-agent/chat', data)
        .then((resp) => resp.data.data)
}
