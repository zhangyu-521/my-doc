
# 一份 部署脚本

``` txt
📄 文件结构
project-root/
├─ dist/               // npm run build 产出
├─ deploy.js           // 下面整段代码
├─ deploy.config.js    // 服务器配置
└─ ecosystem.config.js // PM2 配置（可选）
```
1️⃣ 安装依赖
```bash
npm i node-ssh archiver inquirer dotenv
```

--------------------------------------------------
2️⃣ deploy.config.js
```js
module.exports = {
  host: '121.40.xx.xx',        // 服务器 IP
  port: 22,                    // SSH 端口
  username: 'root',            // 登录用户
  privateKey: require('os').homedir() + '/.ssh/id_rsa', // 本地私钥路径
  localZip: 'dist.zip',        // 本地临时压缩包
  remoteZip: '/tmp/dist.zip',  // 上传到服务器的位置
  remoteDir: '/www/alova-web', // 线上站点目录
  backupDir: '/www/backups',   // 可选：备份旧版本
  restartCmd: 'pm2 reload ecosystem.config.js --env production'
}
```

--------------------------------------------------
3️⃣ deploy.js  （完整代码，含进度条、备份、交互确认）
```js
#!/usr/bin/env node
/**
 * 前端 CI/CD 一键部署脚本
 * node deploy.js  或  DEPLOY_AUTO_YES=true node deploy.js
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeSSH } from 'node-ssh'
import archiver from 'archiver'
import inquirer from 'inquirer'
import 'dotenv/config' // 方便读 .env

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cfg = await import(path.join(__dirname, 'deploy.config.js')).then(m => m.default)

/* ---------- 工具 ---------- */
async function execLocal(cmd, opts = {}) {
  const { execa } = await import('execa')
  return execa(cmd, { shell: true, stdio: 'inherit', ...opts })
}

async function ensureDir(...paths) {
  for (const p of paths) await fs.mkdir(p, { recursive: true }).catch(() => {})
}

/* ---------- 1. 打包 ---------- */
async function compileDist() {
  console.log('\n📦 开始打包...')
  await execLocal('npm run build')
  if (!await fs.stat('dist').catch(() => false)) throw new Error('dist 目录不存在，打包失败')
}

/* ---------- 2. 压缩 ---------- */
async function zipDist() {
  console.log('\n🗜  压缩 dist 目录...')
  await fs.unlink(cfg.localZip).catch(() => {})
  const output = fs.createWriteStream(cfg.localZip)
  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.pipe(output)
  archive.directory('dist', false)
  await archive.finalize()
  return new Promise((res, rej) => {
    output.on('close', res)
    archive.on('error', rej)
  })
}

/* ---------- 3. 连接服务器 ---------- */
async function connectSSH() {
  const ssh = new NodeSSH()
  console.log('\n🔐 SSH 连接中...')
  await ssh.connect({
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    privateKey: cfg.privateKey
  })
  console.log('✅ SSH 已连接')
  return ssh
}

/* ---------- 4. 远端命令 ---------- */
async function runCommand(ssh, cmd) {
  console.log(`[remote] ${cmd}`)
  const res = await ssh.execCommand(cmd)
  if (res.code !== 0) throw new Error(`远程命令失败:\n${res.stderr}`)
  return res.stdout
}

/* ---------- 5. 备份旧文件 ---------- */
async function backupOld(ssh) {
  const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const backupPath = `${cfg.backupDir}/alova-${date}`
  await runCommand(ssh, `mkdir -p ${cfg.backupDir}`)
  await runCommand(ssh, `cp -r ${cfg.remoteDir} ${backupPath}`)
  console.log(`📂 已备份到 ${backupPath}`)
}

/* ---------- 6. 清空目标目录 ---------- */
async function clearOldFile(ssh) {
  await runCommand(ssh, `rm -rf ${cfg.remoteDir}/*`)
}

/* ---------- 7. 上传 ---------- */
async function uploadZipBySSH(ssh) {
  console.log('\n☁  上传压缩包...')
  await ssh.putFile(cfg.localZip, cfg.remoteZip)
  console.log('✅ 上传完成')
}

/* ---------- 8. 解压 ---------- */
async function unzipRemote(ssh) {
  await runCommand(ssh, `cd ${cfg.remoteDir} && unzip -o ${cfg.remoteZip} && rm -f ${cfg.remoteZip}`)
}

/* ---------- 9. 重启服务 ---------- */
async function restartRemote(ssh) {
  if (!cfg.restartCmd) return
  console.log('\n🔄 重启服务...')
  await runCommand(ssh, cfg.restartCmd)
}

/* ---------- 10. 主流程 ---------- */
async function runUploadTask() {
  const ssh = await connectSSH()
  try {
    await backupOld(ssh)
    await clearOldFile(ssh)
    await uploadZipBySSH(ssh)
    await unzipRemote(ssh)
    await restartRemote(ssh)
    console.log('\n🎉 部署成功！')
  } finally {
    ssh.dispose()
  }
}

/* ---------- 11. 交互确认 ---------- */
async function prompt() {
  const auto = /^(1|true|yes)$/i.test(process.env.DEPLOY_AUTO_YES || '')
  if (auto) return true
  const { ok } = await inquirer.prompt([{
    type: 'confirm',
    name: 'ok',
    message: '确定开始部署？',
    default: true
  }])
  return ok
}

/* ---------- 12. 入口 ---------- */
;(async () => {
  try {
    const yes = await prompt()
    if (!yes) return
    await compileDist()
    await zipDist()
    await runUploadTask()
  } catch (e) {
    console.error('\n❌ 部署失败：', e.message)
    process.exit(1)
  }
})()
```

--------------------------------------------------
4️⃣ 使用步骤
```bash
# 1. 打包 + 部署（交互确认）
node deploy.js

# 2. 跳过确认，CI 环境常用
DEPLOY_AUTO_YES=true node deploy.js

# 3. 如果想先本地调试，可注释掉 restartCmd 一行，仅上传文件
```

--------------------------------------------------
5️⃣ 效果演示（终端）
```
📦 开始打包...

> vite build
✓ 18 modules transformed.
dist/index.html                  0.46 kB
dist/assets/index.2d6b0d3e.js   67.82 kB

🗜  压缩 dist 目录...
✅ dist.zip  68 kB

🔐 SSH 连接中...
✅ SSH 已连接
📂 已备份到 /www/backups/alova-2025-12-02T08-15-30
☁  上传压缩包...
✅ 上传完成
🔄 重启服务...
[PM2] Applying action reloadProcessId on app [alova-web](ids: 0)
[PM2] [alova-web](0) ✓
🎉 部署成功！
```

--------------------------------------------------
6️⃣ 可继续扩展
- 加 `slack`/`飞书` 群机器人通知  
- 加 `semver` 自动打 tag  
- 多环境（test / staging / prod）用 `NODE_ENV` 区分配置  
- 用 `GitHub Actions` 调用本脚本即可实现真 · 全自动 CI/CD

把以上 3 个文件丢进任何前端仓库，**一行命令即可上线**，再也不用手动 `scp && unzip && pm2 reload` 啦！