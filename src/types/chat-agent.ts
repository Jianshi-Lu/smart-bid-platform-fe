/** chat-agent 单轮问答请求。 */
export interface ChatRequest {
    question: string
}

/** Java 代理 chat-agent 返回的单轮回答。 */
export interface ChatResponse {
    answer: string
}
