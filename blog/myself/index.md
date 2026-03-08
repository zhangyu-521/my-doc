---
aside: false
---

# 我的开源项目

个人的开源项目和实践经验。

<div class="project-grid">

<!-- dialy_pwa -->
<div class="project-card">
  <div class="project-header">
    <h3>dialy_pwa</h3>
    <span class="project-tag">PWA</span>
  </div>
  <p class="project-desc">一个基于 PWA 技术的日常记录应用，支持离线使用、本地数据存储，提供便捷的日记记录体验。</p>
  <div class="project-features">
    <span class="feature">✅ 可安装为桌面/移动应用</span>
    <span class="feature">✅ 离线可用</span>
    <span class="feature">✅ 本地存储保护隐私</span>
    <span class="feature">✅ 简洁界面</span>
  </div>
  <div class="project-links">
    <a href="https://github.com/zhangyu-521/dialy_pwa" target="_blank">🔗 GitHub</a>
  </div>
</div>

<!-- anyig -->
<div class="project-card">
  <div class="project-header">
    <h3>anyig</h3>
    <span class="project-tag">CLI</span>
  </div>
  <p class="project-desc">一个功能强大且可扩展的 CLI 工具，用于为各种开发工具和环境生成忽略文件。</p>
  <div class="project-features">
    <span class="feature">🎯 多种模板: Git、NPM、ESLint、Prettier、Docker</span>
    <span class="feature">🔧 框架支持: React、Vue、Next.js、Python、Java</span>
    <span class="feature">📝 自定义模板</span>
    <span class="feature">⚙️ 配置文件支持</span>
    <span class="feature">🔄 自动备份</span>
    <span class="feature">📦 批量生成</span>
    <span class="feature">🎨 交互式界面</span>
    <span class="feature">🧪 完整测试</span>
  </div>
  <div class="project-links">
    <a href="https://github.com/zhangyu-521/ig/blob/HEAD/README.zh-CN.md" target="_blank">🔗 GitHub</a>
  </div>
</div>

<!-- electron-todoList -->
<div class="project-card">
  <div class="project-header">
    <h3>electron-todoList</h3>
    <span class="project-tag">Electron</span>
    <span class="project-tag">Vue3</span>
  </div>
  <p class="project-desc">一个优美精致的桌面便签式 TodoList 应用，基于 Electron + Vue 3 + TypeScript 开发。</p>
  <div class="project-features">
    <span class="feature">✨ 毛玻璃效果设计</span>
    <span class="feature">🎨 明暗主题切换</span>
    <span class="feature">📌 桌面置顶</span>
    <span class="feature">🖱️ 自由拖拽</span>
    <span class="feature">📝 任务管理</span>
    <span class="feature">🔍 实时搜索</span>
    <span class="feature">⌨️ 快捷键支持</span>
  </div>
  <div class="project-links">
    <a href="https://github.com/zhangyu-521/electron-todoList" target="_blank">🔗 GitHub</a>
    <a href="https://github.com/zhangyu-521/electron-todoList/releases/tag/releases" target="_blank">⬇️ 下载</a>
  </div>
</div>

<!-- file_upload -->
<div class="project-card">
  <div class="project-header">
    <h3>大文件分片上传</h3>
    <span class="project-tag">React</span>
    <span class="project-tag">Node.js</span>
  </div>
  <p class="project-desc">基于 React 和 Node.js 的大文件分片上传示例项目。</p>
  <div class="project-features">
    <span class="feature">📤 大文件分片上传</span>
    <span class="feature">🔄 断点续传</span>
    <span class="feature">⚡ 并发上传</span>
    <span class="feature">📊 上传进度条</span>
    <span class="feature">⏸️ 暂停/取消上传</span>
    <span class="feature">🚀 文件秒传</span>
    <span class="feature">✅ 文件校验</span>
  </div>
  <div class="project-links">
    <a href="https://github.com/zhangyu-521/file_upload" target="_blank">🔗 GitHub</a>
  </div>
</div>

<!-- electron-camera -->
<div class="project-card">
  <div class="project-header">
    <h3>electron-camera</h3>
    <span class="project-tag">Electron</span>
    <span class="project-tag">Vue</span>
  </div>
  <p class="project-desc">基于 Electron + Vue + TypeScript 开发的摄像头悬浮窗口应用，支持实时摄像头预览、滤镜效果和自定义窗口样式。</p>
  <div class="project-features">
    <span class="feature">🎥 实时摄像头预览</span>
    <span class="feature">🔮 滤镜效果</span>
    <span class="feature">⌨️ 自定义快捷键</span>
    <span class="feature">🪟 悬浮窗口</span>
    <span class="feature">⚙️ 自定义设置</span>
    <span class="feature">💾 配置保存</span>
    <span class="feature">📌 系统托盘</span>
    <span class="feature">🎯 圆形显示</span>
  </div>
  <div class="project-links">
    <a href="https://github.com/zhangyu-521/electron-camera" target="_blank">🔗 GitHub</a>
    <a href="https://github.com/zhangyu-521/electron-camera/releases" target="_blank">⬇️ 下载</a>
  </div>
</div>

</div>

<style>
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.project-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: var(--vp-c-brand);
}

.project-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.project-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--vp-c-brand);
}

.project-tag {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.project-desc {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 16px;
}

.project-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.feature {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--vp-c-text-1);
}

.project-links {
  display: flex;
  gap: 12px;
}

.project-links a {
  color: var(--vp-c-brand);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: opacity 0.2s;
}

.project-links a:hover {
  opacity: 0.8;
  text-decoration: underline;
}

@media (max-width: 640px) {
  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>
