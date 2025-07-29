# PowerShell脚本监控构建过程中的系统资源使用

Write-Host "开始监控构建过程的系统资源使用情况..." -ForegroundColor Green
Write-Host "========================================"

# 创建日志文件
$logFile = "build-monitor.log"
"时间,CPU使用率(%),内存使用率(%),可用内存(MB)" | Out-File -FilePath $logFile -Encoding UTF8

# 启动后台监控作业
$monitorJob = Start-Job -ScriptBlock {
    param($logPath)
    
    while ($true) {
        try {
            # 获取当前时间
            $timestamp = Get-Date -Format "HH:mm:ss"
            
            # 获取CPU使用率
            $cpu = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1
            $cpuUsage = [math]::Round($cpu.CounterSamples[0].CookedValue, 1)
            
            # 获取内存信息
            $memory = Get-CimInstance -ClassName Win32_OperatingSystem
            $totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1024, 0)  # MB
            $freeMemory = [math]::Round($memory.FreePhysicalMemory / 1024, 0)      # MB
            $usedMemory = $totalMemory - $freeMemory
            $memoryUsage = [math]::Round(($usedMemory / $totalMemory) * 100, 1)
            
            # 写入日志
            "$timestamp,$cpuUsage,$memoryUsage,$freeMemory" | Out-File -FilePath $logPath -Append -Encoding UTF8
            
            # 显示实时信息
            Write-Host "`r[$timestamp] CPU: $cpuUsage% | 内存: $memoryUsage% | 可用内存: ${freeMemory}MB" -NoNewline
            
            Start-Sleep -Seconds 2
        }
        catch {
            # 如果出错，继续监控
            Start-Sleep -Seconds 2
        }
    }
} -ArgumentList $logFile

Write-Host "开始构建..." -ForegroundColor Yellow
Write-Host ""

# 记录构建开始时间
$buildStart = Get-Date -Format "HH:mm:ss"
Write-Host "构建开始时间: $buildStart"

# 执行构建
$buildProcess = Start-Process -FilePath "npm" -ArgumentList "run", "docs:build" -Wait -PassThru -NoNewWindow

# 记录构建结束时间
$buildEnd = Get-Date -Format "HH:mm:ss"
Write-Host ""
Write-Host "构建结束时间: $buildEnd"

# 停止监控作业
Stop-Job -Job $monitorJob
Remove-Job -Job $monitorJob

Write-Host ""
Write-Host "构建完成！资源使用情况已保存到 $logFile" -ForegroundColor Green
Write-Host ""

# 分析结果
if (Test-Path $logFile) {
    Write-Host "资源使用统计:" -ForegroundColor Cyan
    Write-Host "============="
    
    # 读取日志数据
    $data = Import-Csv -Path $logFile -Encoding UTF8
    
    if ($data.Count -gt 0) {
        # 计算统计信息
        $cpuValues = $data | Where-Object { $_.'CPU使用率(%)' -ne 'N/A' } | ForEach-Object { [double]$_.'CPU使用率(%)' }
        $memValues = $data | Where-Object { $_.'内存使用率(%)' -ne 'N/A' } | ForEach-Object { [double]$_.'内存使用率(%)' }
        
        if ($cpuValues.Count -gt 0) {
            $avgCpu = [math]::Round(($cpuValues | Measure-Object -Average).Average, 1)
            $maxCpu = [math]::Round(($cpuValues | Measure-Object -Maximum).Maximum, 1)
            Write-Host "平均 CPU 使用率: $avgCpu%"
            Write-Host "最大 CPU 使用率: $maxCpu%"
        }
        
        if ($memValues.Count -gt 0) {
            $avgMem = [math]::Round(($memValues | Measure-Object -Average).Average, 1)
            $maxMem = [math]::Round(($memValues | Measure-Object -Maximum).Maximum, 1)
            Write-Host "平均内存使用率: $avgMem%"
            Write-Host "最大内存使用率: $maxMem%"
        }
    }
    
    Write-Host ""
    Write-Host "详细日志请查看: $logFile" -ForegroundColor Gray
}
