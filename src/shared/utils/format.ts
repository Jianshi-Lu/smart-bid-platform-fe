/**
 * 通用格式化工具(纯函数,无副作用,所有视图复用)。
 *
 * ─── Class hierarchy ───
 *   export function formatTime     (ISO-8601 字符串 → "YYYY-MM-DD HH:mm"; null/空 → '-')
 *   export function formatPrice    (number | null → 保留 2 位小数字符串; null → '-')
 *   export function displayOrDash  (任意值 → 字符串;null/undefined/空字符串 → '-')
 *   export function yesNo         (boolean → '是' / '否')
 *
 * 关系: 4 个函数彼此独立,无内部调用;调用方(视图层)按需 import。
 *
 * 设计原则:
 *   - 全部接受 `undefined` 参数(视图里 `row.createdAt` 可能为 undefined)
 *   - 全部返回字符串(空值兜底为 '-',跟 BE 行为无关,纯展示)
 *   - 不用 dayjs/lodash,避免引第三方依赖
 *
 * 调用方(view):
 *   - 所有 List.vue(列内时间展示)
 *   - 所有 Create/Edit.vue(可选时间字段回显)
 *   - 任何需要"空值兜底 -"的展示场景
 */
export function formatTime(iso?: string | null): string {
  return iso ? iso.replace('T', ' ').substring(0, 16) : '-'
}

export function formatPrice(price?: number | null): string {
  return price != null ? price.toFixed(2) : '-'
}

export function displayOrDash(value?: string | null): string {
  return value != null && value !== '' ? value : '-'
}

export function yesNo(b?: boolean): string {
  return b ? '是' : '否'
}
