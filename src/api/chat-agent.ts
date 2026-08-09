/**
 * chat-agent 会话问答 API。
 *
 * 前端只调用 Java 的 /chat-agent/chat；Python 服务地址由 Java 后端配置，
 * 浏览器不直接连接 Python。
 */
import { http } from '@/api/http'
import type { Result } from '@/types/common'
import type {
    ChatRequest,
    ChatMessage,
    ChatResponse,
    Conversation,
    CreateConversationRequest,
} from '@/types/chat-agent'

/** POST /chat-agent/conversations，创建由 Java 生成 ID 的新会话。 */
export function createChatConversation(
    request: CreateConversationRequest = {},
): Promise<Conversation> {
    return http
        .post<Result<Conversation>>('/chat-agent/conversations', request)
        .then((resp) => resp.data.data)
}

/** PATCH /chat-agent/conversations/{conversationId}/title，手动修改会话标题。 */
export function renameChatConversation(
    conversationId: string,
    title: string,
): Promise<Conversation> {
    return http
        .patch<Result<Conversation>>(
            `/chat-agent/conversations/${encodeURIComponent(conversationId)}/title`,
            { title },
        )
        .then((resp) => resp.data.data)
}

/** DELETE /chat-agent/conversations/{conversationId}，软删除一个会话。 */
export function deleteChatConversation(
    conversationId: string,
): Promise<Conversation> {
    return http
        .delete<Result<Conversation>>(
            `/chat-agent/conversations/${encodeURIComponent(conversationId)}`,
        )
        .then((resp) => resp.data.data)
}

/** GET /chat-agent/conversations，查询当前用户可见的会话。 */
export function listChatConversations(): Promise<Conversation[]> {
    return http
        .get<Result<Conversation[]>>('/chat-agent/conversations')
        .then((resp) => resp.data.data)
}

/** GET /chat-agent/conversations/{conversationId}/messages，读取会话历史。 */
export function listChatConversationMessages(
    conversationId: string,
): Promise<ChatMessage[]> {
    return http
        .get<Result<ChatMessage[]>>(
            `/chat-agent/conversations/${encodeURIComponent(conversationId)}/messages`,
        )
        .then((resp) => resp.data.data)
}

/** POST /chat-agent/chat，提交一个带 conversationId 的问题。 */
export function askChatAgent(data: ChatRequest): Promise<ChatResponse> {

    return http
        .post<Result<ChatResponse>>('/chat-agent/chat', data)
        .then((resp) => resp.data.data)
}
