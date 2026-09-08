# 生产发布与回滚

## 当前候选状态：HOLD

本次发布事务候选尚不能用于生产。MyWeb 专用 P6 连续观察的时长、间隔、请求超时、证据有效期及进程重启规则尚待契约冻结；不能沿用 watcher 的通用默认值，也不能缩短观察窗口或用单次 health 代替。workflow 在获取跨仓库凭据前执行 `policy`，driver 的 `deploy` 在取得生产锁前执行相同检查，当前均以 `E_GATES` 拒绝。

事务文件与恢复测试可独立审查；以下流程描述已实现的状态机及其预期接线，不代表 P6 门禁已完成、生产部署已执行或已获合并许可。当前 `LINGXI_SHA` 保持不变。

## 发布边界

门户与 Lingxi 双站只使用 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) 发布。它从 `hi-veblen` 当前提交构建门户，从 `Lingxi` 的固定 `LINGXI_SHA` 构建网页端与后端，再将三部分组合成同一个不可变发布包。

这条 workflow 不部署 MyWeb API。门户 API 继续由独立 PM2 进程在本机端口 `3001` 运行，发布过程只通过 `/api/health` 验证其状态。PM2 启动和 `db:init` 会通过 Node `--env-file=.env` 读取 root-only 运行配置，但仓库目前没有 MyWeb API 的自动维护和回滚入口；其依赖、数据库迁移和进程重启需要单独获批的维护方案、数据备份与回滚验证。

## 拓扑

| 组件 | 来源 | 生产职责 |
| --- | --- | --- |
| Portal | `hi-veblen` 当前提交 | 数字展厅与 Lingxi 入口 |
| Lingxi frontend | `Lingxi` 的 `LINGXI_SHA` | 登录、角色创建与专属对话界面 |
| Lingxi backend | 同一 `LINGXI_SHA` | 宿主；登录、onboarding、角色创建事务与会话适配网关；角色和会话 API |
| MyWeb API | 独立 PM2 进程 | 门户内容、联系表单与访问数据 |
| Nginx | 服务器现行配置 | 双域静态资源与 API 路由 |

门户、Lingxi 网页端和 Lingxi 后端各有一个 `current` 符号链接。发布目录按 Git revision 和 workflow run 标识创建，发布后不在原目录上覆盖文件。每个 Lingxi backend release 使用独立 `.venv`，systemd 通过 `backend-current/.venv/bin/python` 启动，使运行代码与依赖随同一个指针切换。

以下为既有 2026-07-14 历史验收记录，本次未重新验证其中的生产状态或外部归档。当时生产 revision 为 portal `3b0f010a0fb495504d0c3ffa01006f8bc33a8475`、Lingxi frontend/backend/host `55255df61ae6aef89ce5d8e4d46ba637ca3cd632`。[Portal CI run `29301865888` attempt 2](https://github.com/Timking123/hi-veblen/actions/runs/29301865888/attempts/2) 的四个 job 均为 success；attempt 1 因 GitHub 托管 runner 访问 APT 镜像超时中断，未形成项目代码失败结论。[Lingxi CI run `29301558361`](https://github.com/Timking123/Lingxi/actions/runs/29301558361) 的 Web、Python 3.11、Python 3.12 三个 job，以及 [production workflow `29302920011`](https://github.com/Timking123/hi-veblen/actions/runs/29302920011) 的构建和部署 job 均为 success。生产构建耗时 3 分 30 秒，部署耗时 1 分 50 秒；两个 job 分别搜索 `Traceback`、`AssertionError`、`FileNotFoundError`，六项检查均为 0 命中。匿名公网协议探针 24/24 通过，两站 `release.txt` 与预期 revision 一致，Lingxi 健康接口的 `ok`、`ready`、`continuity_ok` 和 `production_auth_safe` 均为 `true`。六档 Windows Chromium 复验保持 0 横向溢出、单一裂缝宿主与单一 ready Canvas，四类交互痕迹刷新后完整保留，双站控制台 warning/error 为 0，完整证据归档在 `E:\MyAgent Test\P6生产浏览器验收\2026-07-14_1124_P6短会话鉴权优化最终生产复验\`。本次没有生产用户凭据，不能替代登录态角色创建、历史分页或完整对话验收，也不能替代 iOS、Android、Safari 与真实平板真机。

## 发布前条件

1. `hi-veblen` 的三个阻断检查组全部通过：`Release gate`、`Admin quality` 和 `Portal E2E`。
2. 待发布的 Lingxi 提交已经完成其仓库要求的测试与浏览器验收。
3. `LINGXI_SHA` 是完整提交 SHA，并指向准备发布的 Lingxi revision；该 revision 必须包含精确锁定的 `requirements-ci.txt`。触发前要实际复核文件存在，仍指向不含该文件的旧 revision 时不得运行 workflow。
4. GitHub `production` Environment 必须存在。当前没有 required reviewer，发布由具备仓库写权限的人手动触发 `workflow_dispatch`；`LINGXI_REPO_TOKEN`、`SERVER_HOST`、`SERVER_USER`、`SERVER_SSH_KEY` 当前均为 repository-level Actions secrets。若后续启用生产审批，服务器三项 secret 可迁入 Environment，build job 使用的 `LINGXI_REPO_TOKEN` 仍需保留可见作用域。仓库只保存 secret 名称，不保存值。
5. `myagent-world.service` 与 `myagent-gateway.service` 的 `DropInPaths` 均为空；任何临时或未纳管的 systemd drop-in 都必须先清理并恢复正式配置。
6. 发布专用 P6 策略已经正式冻结并接入。当前候选不满足此条件。所有受管历史 run 必须具有合法 `closed` 回执；缺回执、非法、未关闭或旧格式现场均阻止新发布。维护、全局保护、其他 lease 或 staging `PRESERVE` 不能通过手工删除来绕过。
7. MyWeb API 健康，运行数据已经按既定策略备份。

workflow 使用的敏感项包括跨仓库只读 token、服务器主机、部署账号和 SSH 私钥。所有值只放在 GitHub Actions secrets 中，不写入命令示例、日志、文档或仓库文件。

## 发布流程

1. 独立构建门户与固定 revision 的 Lingxi，将 portal、lingxi、backend 和受信 helper、driver、健康校验器写入同一制品。后端 `.release.env` 必须为 UTF-8 无 BOM、三行 LF、末尾恰一 LF，依次包含 revision、Persona capability、WorldLedger `dual-read-v2-preserve` capability。
2. 在服务器发布锁内先检查全部历史 run。创建同事务生命周期 lease 后，按下文独立备份协议建立持久配置归档；此备份在创建 staging 和修改生产配置前完成，归档同步失败即停止。
3. 创建 root-only staging，立即写入 `PRESERVE`，同步文件、run 目录和 staging 父目录，再上传并验证制品摘要与归档成员。候选 release 的独立 Python 3.12 venv、锁版本与 `pip check` 在停服务之前完成。此时不回收旧 release 或旧 run。
4. [release_transaction.py](../scripts/release_transaction.py) 在同一 flock/lease 内捕获三个 current 的原始链接与身份、previous/candidate 制品字节、配置备份、phase、canary 与独立控制代码摘要，持久发布不可变 `previous-backend-v1.json` 和 `prepared` 回执。首次 Nginx 变更、维护变化、停服务或指针切换必须在捕获成功之后。
5. `verify_previous(before-mutation)` 重新核验前像并持久推进 `deploying`。driver 安装受管 Nginx、验证维护阻断、停两个 Lingxi 服务、消费预建候选链接并调用服务安装器。WorldLedger phase 从同一个经过验证的值传入两个 unit。
6. finalize 自行验证维护态门：服务、unit 实际环境、配置、生产认证、D050 合成数据库结构与成长路由、完整健康和 P6 连续观察。观察前后复验配置与 epoch。只有正式 `exposing` 回执原子发布、文件与父目录 fsync 均成功后，才撤维护并执行正常流量门。
7. `exposing` 是禁止自动回滚的围栏。公网门和最终身份、配置复验通过后，finalize 生成 proof，按 `exposing → committing → terminal` 发布可信终态；调用者不能传入 proof、outcome 或健康结果授权成功。
8. 仅可信终态可按固定顺序清理：`terminal → record-removed → preserve-removed → pruning → pruned → lease-releasing → closed`。清理保留 run 目录、回执和 control；最终才释放 flock。workflow 的 `always` 步骤只说明现场处理方式，不按退出码删除或回滚。

## 自动验证

发布 workflow 至少检查以下结果：

- 双站 HTML 可访问，入口节点存在。
- `index.html` 引用的 JavaScript 与 CSS 均存在，MIME 类型正确。
- 随机缺失静态资源返回 `404`，不会错误回退到 HTML。
- 门户构建产物包含生产 Lingxi 地址。
- 门户和 Lingxi 的 `/release.txt` 与预期 revision 一致。
- 门户 `/api/health` 返回健康状态。
- Lingxi `/api/health` 报告生产认证安全、宿主健康且 revision 一致。
- 新 backend release 使用独立 Python 3.12 venv，归属当前 release、无 group/other 写权限且 `pip check` 通过。
- 发布前持久配置备份包含 `.env`、两个 systemd unit、Nginx 可用/启用配置，并按元数据保存 AppArmor profile 与 `ops.env` 的 `present|absent` 状态；归档目录为 `root:root:0700`，归档、元数据和 SHA-256 清单为 `root:root:0600`，且清单复验通过。
- 清理只执行终态回执中的固定计划，保留最新 5 份 release、已验证候选/previous 和实际 current 目标；重试不扩大删除集合，新增保护标记、current 冲突或身份替换会阻断。run 目录、回执和 control 保留，不触碰持久数据。
- 每个远端步骤都必须获得服务器发布锁，暂存创建、切换和 cleanup 还必须持有与本次 `run_id-run_attempt` 一致的生命周期租约。
- 发布前及服务安装后，`myagent-world.service` 与 `myagent-gateway.service` 的 `DropInPaths` 均为空。
- 无效 token 与默认开发 token 均被拒绝并返回 `401`。
- TLS 证书覆盖 Lingxi 域名，Nginx 双域根目录与 API 代理仍指向预期服务。
- 门户与 Lingxi 均返回 `X-Frame-Options: DENY`，`Server` 响应头不泄露版本号。
- Lingxi 的 `Content-Security-Policy` 包含 `frame-ancestors 'none'` 与 `script-src 'self'`。

## 回滚与恢复

恢复必须从独立核验的原事务 MyWeb 制品运行 [production-release-transaction.sh](../scripts/production-release-transaction.sh) 的 `recover <txn_id>`。不得直接执行待验证现场的 control 副本来为自己背书。四个 helper 的生产路径固定，公开接口不接受测试根目录、previous 路径或调用者 proof。

`verify_previous(recovery)` 只读分类，不能证明过去的 fsync 已完成。续做前须重新建立持久化屏障。只有仍处于 pre-exposing、三行 previous 的原 floor 与身份全部通过且能证明未执行开放流量副作用时，才允许 `restore_previous`；该 helper 先确认两个服务停止，再恢复既有 intent 绑定的链接和配置，最后仍须通过 finalize。

旧两行 previous 只允许首次不中断的 compat 发布；它不具备自动业务回滚资格。其失败或中断且没有可信 deployed 终态时必须隔离并人工恢复。已有可信 deployed 终态则可使用回执中的完整记录副本续清理，即使物理 previous 记录已经删除。

正式回执为 `exposing/committing` 时禁止切回旧 writer。恢复先建立维护阻断，复核同一绑定目标和三个 current 的身份，将该目标内两份 unit 模板按安装器的既有四个变量渲染并与实际文件逐字节比较，再检查 systemd 的加载路径、无待重载状态、WorkingDirectory、ExecStart、环境文件和无附加启动命令。`committing` 还须与既有 proof 的 unit 摘要一致。两个 unit 都通过且每次启动前复验后，只对 inactive/failed 服务执行 start；已运行服务保留当前 epoch。随后重新完成全部 finalize 门。此路径不安装依赖或 unit、不 daemon-reload、不改变 current，不引入重启策略或 P6 默认值。材料不足、未知模板、加载信息不匹配或验证失败时重新隔离并保留现场。

写入、rename 或 fsync 异常统一先按磁盘正式回执分类，临时文件不能提升为正式记录，非零退出不能作为回滚授权。

可信 `terminal` 及后继只续清理；清理失败不得再次停服务或业务回滚。`closed` 历史不触碰后续 current 或新 lease。`/run` 重建只允许在唯一锁内按合法记录续接同一事务，不按 PID、时长或目录时间抢占。SIGKILL 本身无法即时执行封流；本实现没有独立即时封流监督器。

两个 [release 清理入口](../scripts/prune-production-releases.sh) 和 [staging 清理入口](../scripts/prune-production-staging.sh) 都只接收 txn id 并委托 `cleanup`，不再接受任意目录或额外保护路径。它们不能发起业务恢复。生产配置持久归档位于 `/var/backups/myagent-production-config`，独立于本事务清理。

### 持久配置归档的验证与恢复边界

持久归档只作为生产灾难恢复材料。workflow 在发布前调用同一处 `validate_config_backup_payload`，验证目录名与 run/revision 元数据一致、摘要清单恰好覆盖两个已知文件、metadata 字段与路径集合完整，以及 tar 成员没有越界、重复、特殊文件、硬链接或非法 Nginx 链接。当前新归档校验或其文件系统持久化屏障失败会在创建 staging 前终止发布；轮转只计算通过同一校验器的归档。

本版本不提供直接写回生产的自动恢复脚本，也不把配置恢复演练或门 III 写成完成。禁止在清单内容受约束前以 root 执行 `sha256sum --check`，禁止直接把归档解包到 `/` 或 `/etc`，禁止只恢复 Nginx 或 AppArmor 后继续运行混合版本配置。

真正恢复必须作为独立、已审查并已演练的生产事务执行，至少满足以下边界：

1. root 持有 `/run/hi-veblen-release.lock`，建立普通文件类型的维护与全局保护标记，停止两个 Lingxi 服务，并先把当前配置保存到新的 root-only 应急目录。
2. 从与备份格式匹配的干净 MyWeb revision 复用 `validate_config_backup_payload`；只有校验通过后，才解包到新的 root-only 隔离目录并复核成员类型、所有权与权限。
3. `.env`、两个 systemd unit、Nginx 双树、AppArmor profile 和可选 `ops.env` 必须处于同一个带 `EXIT` 回退的事务。Nginx 使用同文件系统整树切换；`present|absent` 状态都必须显式恢复。任一步失败都从应急副本恢复全部已变更项，而不是继续启动服务。
4. 全部恢复后执行 `systemctl daemon-reload`，复验两个服务、DropInPaths、AppArmor、Nginx、门户与 Lingxi health/revision。任一门失败时保留应急副本、维护/保护标记和失败现场，并保持 Lingxi 服务停止。

release 回收不删除共享 venv。计划只在可信终态之后生成，保留数可因保护目标超过 5。三指针协调切换使用维护窗口，不宣称无停机或跨路径单指令原子性；窗口预算仍取决于尚未冻结的 P6 发布规则。

已经完成且随后发现业务回归时，优先通过 Git 回退门户提交或将 `LINGXI_SHA` 改回已知正常 revision，再重新运行同一 workflow。不要直接改 `current` 链接，也不要在现行发布目录中热修文件，否则 revision 与实际代码会失去对应关系。

## 数据与凭据

- MyWeb 数据库、Lingxi `data`、`snapshots`、上传文件和日志不进入发布制品，也不进入 Git。
- 生产配置归档只保存在服务器的 root-only 持久目录，不上传 Actions artifact，不在日志中打印配置内容或凭据。workflow 保留最近 30 份通过权限、精确目录成员和摘要校验的完整归档，显式保护本次和最新归档；格式、权限、额外成员或摘要异常的目录不自动删除，因此实际数量可以超过 30。
- workflow 先把活动配置复制到 root-only 临时快照，普通文件会在复制后与源文件比较，再只从快照打包，显著收窄预检到归档之间的路径竞态。发布锁只能排斥本 workflow；Nginx 目录若被另一个 root 进程同时改写，快照不具备文件系统级原子性，恢复前仍须核对归档时间、revision 与现场变更记录。
- `.env*` 默认忽略，仅 `.env.example` 可以跟踪；示例文件只能包含无敏感性的本地默认值。
- 从当前提交停止跟踪只能保护后续 revision。任何曾进入 Git 历史的凭据都需要立即轮换，历史净化必须由仓库所有者单独授权并安排强制同步窗口。
- 发布日志不得输出 secret、token、用户角色正文或数据库内容。

## D087 资源组件与接线边界

资源组件遵守二进制单位与固定限额。等于上限仅表示这一项资源计量合格，仍须通过其他限额、格式、身份、原恢复资格和发布门；严格超限停止，不截断或重置计数后继续。

| 计量对象 | 固定上限 | 当前接线 |
| --- | --- | --- |
| 单份 B/C 帧元数据的完整原始字节 | 64 KiB | 仅私有字节计量函数，帧接收入口尚未实现 |
| 单个完整压缩输入 | 2 GiB | 制品生成后、上传前、远端归档读取与配置备份校验 |
| 完整解压 tar 流 | 8 GiB | 逐块累计，包含头、扩展、文件 padding、结束块及零尾部 |
| venv 完成态普通文件逻辑大小总和 | 8 GiB | 系统解释器在构建完成后扫描，capture 前再次扫描 |
| 归档原始成员、每棵 venv/待删树目录项 | 各 100000 | 原始扩展头与显式归档根也计成员；物理树锚定根不计 |
| 每项普通文件逻辑大小 | 1 GiB | 归档声明与实际正文，以及物理普通文件 stat 逻辑大小 |
| 规范 UTF-8 相对路径 | 4096 字节 | 在规范字符串复制、编码或组件列表分配前累计字节和深度 |
| 规范相对路径深度 | 64 层 | 归档和树扫描；锚定根深度为零 |
| 同一操作同时保留的扫描表及工作区 | 512 MiB | 所有待删树共用预算，执行索引和复验继续使用同一预算 |

归档入口借用二进制流并读取完整输入，处理短读、提前 EOF、声明与实际长度不符、压缩校验错误和尾部数据；不关闭调用者的流，不保留正文，不自行解包或删除。当前支持单个 gzip 内的 GNU/PAX 普通归档，拒绝拼接 gzip、稀疏、硬链接及其他不支持的特殊项。支持的 GNU/PAX 长字段先覆盖可能在多字节字符中截断的基础头，再对最终有效路径和链接作严格 UTF-8 校验。扩展只解析有限字段与有限记录；未支持或重复的结构明确失败。

发布制品只允许普通文件和目录。配置备份还必须经过原有 metadata、required/optional 路径及精确成员资格校验；仅 `etc/nginx/sites-enabled/` 的直接子项可以是链接，其归一化目标须为本包内 `etc/nginx/sites-available/` 的直接普通文件，支持目标在后出现。链接文本不跟随外部文件系统。venv 的链接自身计成员与扫描表，不重复计外部目标。配置控制文本读取另限 4 MiB、64 行，以覆盖现有固定字段结构；这不是 B/C 帧元数据接收接线，也不放宽原有控制源码、record、receipt 或静态单项上限。

清理先验证既有正式计划与当前保护，再绑定原计划根身份，完成本次全部候选的同预算扫描及完整复验，之后按后序清单逐项执行。新扫描捕获的身份不能替换原删除资格；根、祖先或对象漂移及新增目录项均停止后续执行。配置轮转在同一进程、同一预算中完成有界收集、排序、资格验证、选择、全部预扫描及删除；仍按 mtime 降序、同值名称逆序，保护本次、排序后第一个名称合法目录及前 30 份完整有效备份。完整验证入口要求 root:root、目录 0700、恰三项非链接普通文件 0600，保留异常资格项；资源失败及身份漂移令整批停止，首删前发现时零删除。固定三文件原身份及大小绑定至清理计划，新增项不能进入删除清单。失败的配置临时材料不由 EXIT trap 自动回收。第一项删除之后发生新的漂移，只能停止剩余删除，不能撤销此前操作。

扫描表的保守计费只支持 64 位 CPython：预算自身与计数/预留账本槽先计费；字典槽按 1024 字节覆盖键、值及扩容新旧容量；归档记录按固定对象费加 Unicode 最坏四字节字符费，临时父索引和最终 tuple 另计；树记录还包含六值不可变身份及原始链接字节。归档解码工作区预留 2 MiB，每层物理树遍历与有界路径暂存预留 128 KiB，构造索引和 tuple 前支付其容量。多个保留结果由同一调用操作显式传入同一个预算；`scan_bytes` 是结果保留数据的计费，预算 live/peak 另外记录工作区和同时保留对象。资源拒绝后预算保持失败态，释放已回收的已知预留不会恢复成功资格。对象遍历与 tracemalloc 对照用于检查计费覆盖，计费不是进程 RSS、磁盘空间或目标主机容量保证。

资格验证返回 None 后，只有实际释放的临时归档、索引及内容工作区可回收计费；预算永久计数域、历史账本槽、峰值、失败态以及此前仍保留的结果保持。多份备份不会因逐次重领预算绕过总表限额，也不会累积已经释放的 64 MiB 内容工作区。

配置快照由 `cp --archive` 保留原属主和权限，归档完成后的固定 `cleanup --snapshot` 私有调用因此单独保留这些后代属性。快照根仍要求 root:root、0700，子项只准普通文件、目录或符号链接，沿原根及已扫描祖先的描述符逐级打开、复验原身份并有界删除；不修改 tar 中的原始元数据。通用清理、venv 和正式备份轮转的权限资格不放宽。

workflow 的 deploy job 显式检出本次 `github.sha` 维护源，关闭凭据持久化并核对 HEAD；下载产物放在独立 runner 临时目录。从唯一维护源按固定依赖白名单生成有界 Bash 前导，并与原 REMOTE 脚本拼成原同一次 SSH 的 stdin。源码和最终 UTF-8 文本分别限制 4 MiB，缺失、重复、未知依赖或定界冲突拒绝；测试核对函数源码及真实生成结果的 Python/Bash 语法，每个 run 段保持宿主长度限制。此适配不增加公开 CLI、SSH 参数或会话、远端辅助文件或持久协议；现有历史门来源及其他首次可信写入问题仍受原审查边界约束。

本片不覆盖 SCP 接收过程的逐块上限、venv 构建时缓存/临时文件峰值、完整 B/C 新帧、连续挂载身份及单进程持锁调度。小样本与缩小预算只能证明对应逻辑；真实 GiB 边界、物理树和代表性制品容量分别记录，不从常量或整数计数断言推出正常运行保证。Windows 的 Linux 用例跳过不能关闭 POSIX 门，CI 必须使用 `--require-posix`。D087 组件资格不解除 P1、完整 B/C、原正式审查或生产发布 HOLD。

有界接收 I/O 基础另提供三个尚未接线的私有入口：`_bc_read_exact` 只物化最多 65536 字节的小段；`_bc_copy_exact` 用最多 65536 字节的块完整写入调用者提供的 sink；`_bc_require_eof` 单独探测一个字节，只有空返回才证明完整 EOF。三个入口按固定资源域共享同一预算，调用前拒绝超大声明，实际读入才累计；正数短写全部完成后才读取下一块。工作区及仍存活返回对象先计费，任一失败锁存预算并保留尚未确认回收的费用，释放工作区不能恢复成功资格。

这些入口不解释帧、不打开路径或关闭借用流、不自动 flush/fsync、不补偿部分输出，也不产生业务回执；现有前导、公开 CLI 与发布调用点尚未使用它们。底层普通 I/O 异常转换为固定脱敏错误，未知 BaseException 锁存后原样传播。Python 可自动保留调用者本来活跃的 except 上下文，标准 traceback 通过 from None 抑制展示，不能宣称隔离调用者自己的运行时对象。纯流测试与常量块实际 2 GiB 三点仅支持组件接收边界，不证明 gzip 解析、SCP 接收链、目标主机容量或进程 RSS 硬限制。

## 离线验证与未验证边界

在 root Linux 私有临时根运行 `python3 -B scripts/test_release_transaction.py --require-posix`。测试使用真实目录 fd、no-follow、flock、rename、fsync 和 SIGKILL；仅私有根入口、独立制品来源、服务和网络边界使用夹具。Windows 不能替代这些 POSIX 门，CI 不允许全量 skip 后报成功。

canary 原始值在 SSH 之前必须整串匹配空值或逗号分隔的 64 位小写十六进制；测试直接提取 workflow 的本地段，用无网络替身模拟 OpenSSH 拼接 argv 后的远端 shell 重解析，并校验第八参数。事务健康门要求宿主 WorldLedger capability/phase 为真实字符串，与顶层和事务期望一致。后加载环境文件的保留键检查按 python-dotenv 的赋值语法处理单引号键、export、跨物理行值和 CR/LF；VT、NEL、U+2028、U+2029 不作为物理换行。缺赋值与空赋值有别，双引号键按 dotenv 的字面键语义处理。运行时仅使用标准库。

以下三个机制仍待独立裁决与实现，当前不具备解除发布 HOLD 的资格：无 lease 且回执损坏时如何独立证明当前 writer 属于旧事务；workflow 早期 root 写入如何先绑定受信祖先目录；多个 SSH 进程及交接中的解锁间隙如何满足同一 flock 连续占有。不能用全局停服补第一个缺口，否则旧 closed A 的坏回执可能干扰后续合法 B；也不能仅删除 `flock -u`，否则 driver 重新打开锁会与现有锁冲突。这些是将来启用路径的风险，标准 deploy 当前仍在 P6 policy 门无条件 HOLD，本轮未运行生产验证。

CI 同时保留 D050 helper、健康/Nginx 自检及持久配置归档轮转测试。事务测试中的观察参数和外部 watcher 替身只用于状态机故障注入，不构成实际 P6 连续观察证明。尚未验证生产 SSH、服务切换、真实数据、provider 或部署。待策略冻结后，必须完成实际 watcher 接线与连续证据校验、精确提交 CI，再另行评审发布资格。

## 失败处理

| 阶段 | 处理方式 |
| --- | --- |
| P6 发布策略未冻结 | workflow/driver 提前 HOLD，不进入生产事务 |
| 构建、制品或候选 venv 失败 | 不切 current；保留已有保护现场 |
| 持久配置备份失败 | 创建 staging 前停止，已有归档保留 |
| 历史 run 缺回执、非法或未 closed | 阻止新发布，不猜测旧现场安全 |
| pre-exposing 失败，三行 previous 且原资格复验成功 | 停服务并完成既有恢复 intent，再运行完整 finalize |
| 旧两行 previous 失败且无可信 deployed 终态 | 隔离、保留现场并人工恢复 |
| exposing/committing 失败或提交结果不确定 | 持锁复读，禁止业务回滚；只复核既定目标或人工恢复 |
| terminal 及后继清理失败 | 保留可信业务结果，只续固定清理计划 |
| lease 释放或 closed 持久化失败 | 核对实际释放结果后收尾，新发布继续等待 |
| 全局保护、current 冲突或待删对象身份漂移 | 拒绝删除，保留计划和现场 |
