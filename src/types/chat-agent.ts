/** Java chat-agent 会话问答请求。 */
export interface ChatRequest {
    conversationId: string
    clientMessageId: string
    question: string
}

/** Java 代理 chat-agent 返回的已持久化回答。 */
export interface ChatResponse {
    conversationId: string
    requestId: string
    clientMessageId: string
    answer: string
    title?: string | null
}

/** 前端新建和切换会话所需的最小视图。 */
export interface Conversation {
    conversationId: string
    title: string
    titleSource: string
    status: string
    lastMessageAt: string | null
    createdAt: string
    updatedAt: string
}

/** 新建会话时可选标题；资料范围由每轮问题动态检索。 */
export interface CreateConversationRequest {
    title?: string
}

/** 会话历史消息视图。 */
export interface ChatMessage {
    messageId: string
    conversationId: string
    requestId: string
    clientMessageId: string | null
    role: 'USER' | 'ASSISTANT' | string
    content: string | null
    contentType: string
    sequenceNo: number
    status: string
    errorCode: string | null
    errorMessage: string | null
    createdAt: string
    updatedAt: string
}
