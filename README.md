# 啡芽团队杯测

手机优先静态页面，通过 GitHub Pages 发布。账号和数据由 Supabase 托管，不依赖 GPT。

## 权限

- 普通账号：创建自己的场次、录入豆子、六项评价和照片、提交；可以继续自己的未完成场次。
- 管理员：上述功能，加上全员按场次 / 按豆子只读回顾。
- 数据库 RLS 限制普通账号只能读取自己的云端数据。管理员回顾由数据库函数校验角色。前端无法修改角色。
- 角色从 `feiya_profiles` 读取，禁止客户端写入该表。
- 同一账号多设备保存使用 revision 乐观锁，冲突拒绝覆盖。每个工作区限制 20MB，达到上限时保存失败并保留本次未提交表单。

## 发布步骤

1. 在 Supabase 新项目执行 `schema.sql`，只通过受信任的管理端创建两个账号。
2. 账号用户名建议 `feiya_user` 和 `feiya_admin`，其认证邮箱分别为 `feiya_user@accounts.feiya.example` 和 `feiya_admin@accounts.feiya.example`。这些是内部登录标识，不用于收件；部署时通过管理 API 确认邮箱。
3. 管理端插入对应的 `feiya_profiles` 行，分别分配 `user` / `admin`。关闭公开注册。生成随机密码并私下交付，不提交到仓库。
4. 在 `config.js` 配置项目 URL 和 public publishable key。禁止写入 service-role key。
5. 创建 GitHub 仓库并提交代码；Settings → Pages → Source 选择 Deploy from a branch，main / root。
6. 上线后必须用两种真实账号分别验证：普通账号不能调用全员回顾或读取其他账号数据；管理员能回顾普通用户提交的数据。

## 当前状态

已部署到 https://kkkkay-gh.github.io/kayho/ 。项目连接、数据库权限、普通账号和管理员账号已配置。账号密码通过独立私密文件交付，不在仓库内。

已真实验证账号密码登录、普通用户仅能读取自己的数据、不能修改角色、不能读取全员回顾、匿名访问拒绝、旧版本保存冲突拒绝，以及管理员通过授权接口回顾普通用户的测试记录。

当前保留一条明确标记“功能测试示例 · 非正式杯测”的记录。旧版浏览器本地记录不自动上传。
