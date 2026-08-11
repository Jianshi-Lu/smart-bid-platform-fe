# 复星万邦品牌化 Design QA

## 对比目标与证据

- Source visual truth: `/Users/lujianshi/Desktop/实习汇报/实习汇报_空白共创稿.pptx` 第 1 页。
- Source render: `/private/tmp/codex-brand-template.0WNMwR/template-inspect/source-slides/source-slide-01.png`，1280 × 720 px。
- Implementation screenshot: `/private/tmp/codex-brand-template.0WNMwR/frontend-final-default.png`，390 × 978 px。
- Full-view comparison: `/private/tmp/codex-brand-template.0WNMwR/qa-final-full-comparison.png`。
- Focused logo comparison: `/private/tmp/codex-brand-template.0WNMwR/qa-final-focus-comparison.png`。
- Browser state: `http://localhost:5173/#/` 角色选择页；CSS viewport 390 × 844，`devicePixelRatio = 2`，浏览器截图输出已归一化为 390 px 宽。
- Desktop layout check: CSS viewport 1440 × 900；页眉 1440 × 64，品牌横幅 1168 × 242，两张角色卡均为约 368 × 271，页面无纵向或横向溢出。

PPT 是品牌视觉参考而不是同构网页稿，因此不做逐像素布局复制；全视图比较用于核对品牌层级、主视觉、颜色和信息密度，聚焦比较用于核对 Logo 原始比例、清晰度和落位。

## Findings

- 无遗留 P0 / P1 / P2 问题。
- 字体与层级：沿用当前前端的系统中文字体栈，保留既有业务组件尺寸；品牌标题使用模板中的深蓝层级与白色封面标题关系，没有异常换行或截断。
- 间距与布局：Logo 位于全局页眉的非功能品牌区；角色选择页主视觉与角色卡之间保留清晰层级，两个角色入口仍是首屏核心交互。
- 颜色与令牌：深蓝 `#003B82`、标题蓝 `#0054A6`、浅青 `#A9D9DE` 与模板提取结果一致；状态色与危险色未被品牌色覆盖。
- 图片质量：全局 Logo、白色 Logo、主视觉和站点图标均直接提取自用户提供的 PPTX，没有手绘、近似重制或拉伸变形。
- 文案：公司全称与模板一致；平台名称统一为“智能招投标管理平台”。

## Comparison History

### Iteration 1

- [P2] 首版误用了模板内的抽象蓝色背景，缺少封面右侧圆环主视觉，品牌识别不完整。
  - Fix: 改用 PPTX 中的原始封面主视觉资源，桌面端保留左侧文本区与右侧品牌图形。
- [P2] 390 px 窄屏中重复显示横幅 Logo，并出现 4 px 横向溢出。
  - Fix: 移动端保留全局页眉 Logo，隐藏横幅内的重复 Logo 与次要描述，限制角色页横向溢出。

### Iteration 2

- Post-fix evidence: 390 px 页面 `documentElement.scrollWidth = 390`；横幅、两张角色卡和功能图标完整可见。
- Post-fix visual comparison: 原始封面圆环、蓝色层级与 Logo 已在实现中形成一致的品牌识别，无可执行的 P0 / P1 / P2 差异。

## Interaction And Runtime Checks

- 全局导航按钮可打开并关闭，招标方与投标方分组均可见。
- 点击公司 Logo 可返回角色选择页。
- 招标方和投标方角色卡仍按现有登录状态进入对应入口；投标方首页及“我的投标”入口可见。
- 业务页页眉在 390 px 下无元素重叠，退出登录按钮仍在原位置可用。
- 浏览器控制台未发现 `error` 或 `warn`。
- 未修改上传、下载、菜单、文件状态、角色卡片等功能性图标或其事件绑定。

## Follow-up Polish

- 当前没有阻塞交付的 P3 项。若后续新增全局看板，可继续复用同一组 Logo、品牌令牌和封面主视觉，不需要再次抽取资产。

final result: passed
