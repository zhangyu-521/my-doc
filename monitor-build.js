const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');

console.log('🚀 开始监控构建过程的系统资源使用情况...');
console.log('================================================');

// 创建日志文件
const logFile = 'build-monitor.log';
const logData = [];

// 获取系统信息
function getSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = ((usedMem / totalMem) * 100).toFixed(1);
  const freeMemMB = (freeMem / 1024 / 1024).toFixed(0);
  
  // 获取CPU使用率（通过loadavg近似）
  const loadAvg = os.loadavg()[0]; // 1分钟平均负载
  const cpuCount = os.cpus().length;
  const cpuUsage = ((loadAvg / cpuCount) * 100).toFixed(1);
  
  return {
    timestamp: new Date().toLocaleTimeString(),
    cpuUsage: Math.min(100, Math.max(0, cpuUsage)), // 限制在0-100之间
    memUsage: parseFloat(memUsage),
    freeMemMB: parseInt(freeMemMB),
    totalMemGB: (totalMem / 1024 / 1024 / 1024).toFixed(1)
  };
}

// 监控函数
let monitorInterval;
let maxCpu = 0;
let maxMem = 0;
let samples = [];

function startMonitoring() {
  console.log('📊 开始资源监控...\n');
  
  monitorInterval = setInterval(() => {
    const info = getSystemInfo();
    samples.push(info);
    
    // 更新最大值
    maxCpu = Math.max(maxCpu, parseFloat(info.cpuUsage));
    maxMem = Math.max(maxMem, info.memUsage);
    
    // 实时显示
    process.stdout.write(`\r[${info.timestamp}] CPU: ${info.cpuUsage}% | 内存: ${info.memUsage}% | 可用: ${info.freeMemMB}MB`);
    
    // 记录到日志
    logData.push(`${info.timestamp},${info.cpuUsage},${info.memUsage},${info.freeMemMB}`);
  }, 2000); // 每2秒监控一次
}

function stopMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }
  
  console.log('\n\n📈 构建完成！正在生成资源使用报告...');
  
  // 保存日志文件
  const logContent = ['时间,CPU使用率(%),内存使用率(%),可用内存(MB)', ...logData].join('\n');
  fs.writeFileSync(logFile, logContent, 'utf8');
  
  // 计算统计信息
  if (samples.length > 0) {
    const avgCpu = (samples.reduce((sum, s) => sum + parseFloat(s.cpuUsage), 0) / samples.length).toFixed(1);
    const avgMem = (samples.reduce((sum, s) => sum + s.memUsage, 0) / samples.length).toFixed(1);
    const totalMemGB = samples[0].totalMemGB;
    
    console.log('\n📊 资源使用统计:');
    console.log('================');
    console.log(`🖥️  系统总内存: ${totalMemGB}GB`);
    console.log(`⚡ 平均 CPU 使用率: ${avgCpu}%`);
    console.log(`🔥 最大 CPU 使用率: ${maxCpu.toFixed(1)}%`);
    console.log(`💾 平均内存使用率: ${avgMem}%`);
    console.log(`🚀 最大内存使用率: ${maxMem.toFixed(1)}%`);
    console.log(`📝 详细日志已保存到: ${logFile}`);
    
    // 性能评估
    console.log('\n🎯 性能评估:');
    if (maxCpu > 80) {
      console.log('⚠️  CPU使用率较高，建议关闭其他应用程序');
    } else if (maxCpu > 50) {
      console.log('✅ CPU使用率正常');
    } else {
      console.log('💚 CPU使用率较低，系统性能良好');
    }
    
    if (maxMem > 80) {
      console.log('⚠️  内存使用率较高，建议增加系统内存');
    } else if (maxMem > 60) {
      console.log('✅ 内存使用率正常');
    } else {
      console.log('💚 内存使用率较低，系统内存充足');
    }
  }
}

// 开始监控
startMonitoring();

console.log('🔨 开始构建...');
const buildStart = new Date();

// 启动构建进程
const buildProcess = spawn('npm', ['run', 'docs:build'], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  const buildEnd = new Date();
  const buildTime = ((buildEnd - buildStart) / 1000).toFixed(1);
  
  stopMonitoring();
  
  console.log(`\n⏱️  构建耗时: ${buildTime}秒`);
  
  if (code === 0) {
    console.log('✅ 构建成功完成！');
  } else {
    console.log(`❌ 构建失败，退出码: ${code}`);
  }
  
  process.exit(code);
});

buildProcess.on('error', (error) => {
  stopMonitoring();
  console.error('❌ 构建进程启动失败:', error.message);
  process.exit(1);
});

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n\n⏹️  构建被用户中断');
  stopMonitoring();
  if (buildProcess) {
    buildProcess.kill();
  }
  process.exit(1);
});
