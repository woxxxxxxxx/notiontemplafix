# NotionTemplaFix 交接文档

最后更新：2026-06-19  
站点：notiontemplafix.com  
回复要求：所有回复用中文；直接判断、直接执行；批量问题先全量扫描，再统一改。

## 站点定位

NotionTemplaFix 现在不是单纯卖“网站小工具”，也不是只卖 Notion 模板，而是双交付产品：

- Notion 模板：用于长期保存用户数据，可复制到用户自己的 Notion workspace。
- Browser Web App：用于更漂亮、更顺滑的网页体验，数据保存在浏览器本地。

产品页面、FAQ、交付说明都要保持这个口径：购买包含 Notion template + matching browser web app。

## 当前产品结构

- 16 个付费产品，每个产品都有一个独立 Notion 单品模板页和一个本地 web app。
- 3 个免费 app 已归入 My Library 的 Unlocked Apps。
- Bundle：`https://payhip.com/b/NdT6c`，价格 $49，包含 16 个付费单品。
- Bundle checkout：`https://payhip.com/order?link=NdT6c`
- 测试优惠码：`669R3WT07O`

## Notion 模板交付

Notion 模板分两套：

- Bundle 父页面：`NotionTemplaFix Templates`
  - 链接记录：`notion-template-links.json`
  - 用于 Bundle 总览和全量模板集合。
- Single Delivery 父页面：`NotionTemplaFix Single Delivery`
  - 链接记录：`notion-single-delivery-links.json`
  - 16 个单品各自独立发布，用户买单品时只能看到对应单品模板。

每个 Notion 单品页面已补充：

- emoji/icon
- Start Here
- Quick launch
- Dashboard snapshot
- Setup checklist
- Core modules
- Recommended workflow
- FAQ
- 独立数据库和示例数据

注意：如果后续改 Notion 模板内容，Bundle 页和 Single Delivery 页要保持体验一致，不能出现“展示页面比交付页面更丰富”的问题。

## PayHip 交付逻辑

PayHip 下载页只显示文件列表，不会直接渲染 HTML 文件里的按钮。因此当前正确交付方式是每个单品交付两个文件：

- `xxx-app.html`：网页 App 文件
- `xxx-notion-template-link.html`：Notion 模板入口文件，包含 Notion 模板链接、My Library 链接和使用说明

已完成上传：16/16 个 PayHip 单品都已替换为“双文件交付”。旧的 `xxx-delivery.html` 单文件交付已从 PayHip 后台移除。

Bundle 不单独依赖 `bundle-delivery.html`。PayHip Bundle 是组合 16 个单品，买 Bundle 的用户会拿到这 16 个单品各自的双文件交付。

本地交付文件目录：

- `payhip-delivery/`
- `payhip-delivery/*-notion-template-link.html`
- `payhip-delivery/*-delivery.html` 是旧过渡文件，PayHip 后台当前不再使用它作为单品最终交付。

相关脚本：

- `scripts/generate-payhip-notion-link-files.js`：根据 `notion-single-delivery-links.json` 生成 16 个 Notion 模板入口 HTML。
- `scripts/payhip-delivery-upload-two-files.js`：用 PayHip 已登录浏览器会话，把每个单品上传为 App HTML + Notion Link HTML 两个文件。
- `scripts/payhip-delivery-upload.js`：旧脚本，曾用于单 `delivery.html` 上传，不作为当前推荐流程。

PayHip 自动化依赖：

- 复用浏览器会话：`C:\Users\Administrator\contractfixpro\scripts\browser-session`
- 依赖包在 `contractfixpro` 项目里：`playwright-extra` + stealth plugin
- PayHip 没有稳定公开 REST API，后台操作仍以 Playwright 自动化为主。

## My Library / 购买验证逻辑

My Library 当前按两类展示：

- Unlocked Apps
- Locked Apps

免费 app 默认显示为 unlocked。付费 app 解锁后进入 Unlocked Apps。

当前站点验证核心：

- PayHip Webhook + `webhook.php` / `check-purchase.php` 用于服务端购买验证。
- 前端 Purchase help 需要输入购买邮箱 + 选择购买产品，由服务器匹配 PayHip 记录后再恢复本浏览器访问。
- 不允许“只填邮箱就解锁”，避免未购买用户白嫖。
- 购买后的当前浏览器可自动写入本地解锁状态；换设备或清缓存后走 Purchase help 验证恢复。

注意事项：

- PayHip webhook 必须配置到 `https://notiontemplafix.com/webhook.php`
- PayHip Developer settings 里至少勾选 `paid` 事件。
- 如果 Purchase help 查不到刚购买订单，优先排查 webhook 是否命中、`purchased.json`/服务端记录是否更新、PayHip 产品 key 映射是否一致。

## 部署与安全

部署方式：Hostinger FTP，运行：

```bash
node deploy-ftp.js
```

`deploy-ftp.js` 已排除内部文件，避免把自动化资料、Notion 链接表、PayHip 交付源文件传到公网：

- `AGENTS.md`
- `CLAUDE.md`
- `notion-template-links.json`
- `notion-single-delivery-links.json`
- `notion-single-publish-checklist.md`
- `payhip-delivery/`

如果 FTP 缓存顽固，可强制全量：

```bash
rm -f .ftp-deploy-sync-state.json deploy-cache.json .deploy-cache
node deploy-ftp.js
```

## 最新关键改进记录

- 明确产品形态：Notion template + browser web app 双交付。
- 创建并发布 16 个 Single Delivery Notion 单品模板。
- 保留 Bundle Notion 父页面，但单品购买不暴露全部 Bundle 模板。
- 修正 PayHip 交付体验：从单 `delivery.html` 改为两个可见文件。
- My Library 删除旧的 `Download app file` 单点逻辑，改为 `Open App` + `Open Notion Template`。
- PayHip 单品后台已上传并验证 16 个产品的双文件交付。

## 后续维护原则

- 新增/修改单品时，必须同步四处：产品详情页、web app、Notion Single Delivery、PayHip 双文件交付。
- 如果改 Notion 链接，先更新 `notion-single-delivery-links.json`，再运行 `generate-payhip-notion-link-files.js`，最后用 `payhip-delivery-upload-two-files.js` 上传。
- 不要再把单品最终交付退回单个 `delivery.html`，PayHip 下载页会显得像“只有一个 HTML 文件”，用户感知差。
- Bundle 逻辑优先继承单品交付，不额外维护一套容易过期的 Bundle-only 交付文件。
