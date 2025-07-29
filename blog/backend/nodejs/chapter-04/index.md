# 第4章：文件系统与流操作

## 本章目标

- 掌握Node.js文件系统API的使用
- 理解同步与异步文件操作的区别
- 深入学习流的概念和类型
- 熟练使用可读流和可写流
- 掌握管道操作和流的组合技巧

## 4.1 文件系统API详解

### 基本文件操作

```javascript
// file-operations.js - 基本文件操作

const fs = require('fs');
const path = require('path');

// 1. 读取文件
// 异步读取
fs.readFile('example.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err.message);
        return;
    }
    console.log('文件内容:', data);
});

// 同步读取
try {
    const data = fs.readFileSync('example.txt', 'utf8');
    console.log('同步读取:', data);
} catch (err) {
    console.error('同步读取失败:', err.message);
}

// Promise版本
const fsPromises = require('fs').promises;

async function readFileAsync() {
    try {
        const data = await fsPromises.readFile('example.txt', 'utf8');
        console.log('Promise读取:', data);
    } catch (err) {
        console.error('Promise读取失败:', err.message);
    }
}

// 2. 写入文件
const content = 'Hello Node.js!\n这是写入的内容。';

// 异步写入
fs.writeFile('output.txt', content, 'utf8', (err) => {
    if (err) {
        console.error('写入失败:', err.message);
        return;
    }
    console.log('文件写入成功');
});

// 追加内容
fs.appendFile('output.txt', '\n追加的内容', 'utf8', (err) => {
    if (err) {
        console.error('追加失败:', err.message);
        return;
    }
    console.log('内容追加成功');
});
```

### 目录操作

```javascript
// directory-operations.js - 目录操作

const fs = require('fs');
const path = require('path');

// 1. 创建目录
fs.mkdir('new-directory', { recursive: true }, (err) => {
    if (err) {
        console.error('创建目录失败:', err.message);
        return;
    }
    console.log('目录创建成功');
});

// 2. 读取目录
fs.readdir('.', (err, files) => {
    if (err) {
        console.error('读取目录失败:', err.message);
        return;
    }
    console.log('目录内容:', files);
});

// 3. 获取文件/目录信息
fs.stat('package.json', (err, stats) => {
    if (err) {
        console.error('获取信息失败:', err.message);
        return;
    }
    
    console.log('文件信息:');
    console.log('- 是否为文件:', stats.isFile());
    console.log('- 是否为目录:', stats.isDirectory());
    console.log('- 文件大小:', stats.size, 'bytes');
    console.log('- 创建时间:', stats.birthtime);
    console.log('- 修改时间:', stats.mtime);
});

// 4. 递归读取目录
async function readDirRecursive(dirPath) {
    const items = await fsPromises.readdir(dirPath);
    const result = [];
    
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await fsPromises.stat(fullPath);
        
        if (stats.isDirectory()) {
            const subItems = await readDirRecursive(fullPath);
            result.push({
                name: item,
                type: 'directory',
                path: fullPath,
                children: subItems
            });
        } else {
            result.push({
                name: item,
                type: 'file',
                path: fullPath,
                size: stats.size
            });
        }
    }
    
    return result;
}

// 使用递归读取
readDirRecursive('.')
    .then(tree => {
        console.log('目录树:', JSON.stringify(tree, null, 2));
    })
    .catch(err => {
        console.error('递归读取失败:', err.message);
    });
```

### 文件监听

```javascript
// file-watcher.js - 文件监听

const fs = require('fs');
const path = require('path');

// 1. 监听单个文件
const filename = 'watched-file.txt';

// 创建被监听的文件
fs.writeFileSync(filename, '初始内容');

// 监听文件变化
const watcher = fs.watch(filename, (eventType, filename) => {
    console.log(`文件 ${filename} 发生了 ${eventType} 事件`);
    
    if (eventType === 'change') {
        fs.readFile(filename, 'utf8', (err, data) => {
            if (!err) {
                console.log('新内容:', data);
            }
        });
    }
});

// 5秒后修改文件
setTimeout(() => {
    fs.appendFile(filename, '\n修改后的内容', () => {
        console.log('文件已修改');
    });
}, 2000);

// 10秒后停止监听
setTimeout(() => {
    watcher.close();
    console.log('停止监听');
}, 10000);

// 2. 监听目录
const dirWatcher = fs.watch('.', { recursive: true }, (eventType, filename) => {
    if (filename) {
        console.log(`目录中的文件 ${filename} 发生了 ${eventType} 事件`);
    }
});

// 使用fs.watchFile监听文件状态
fs.watchFile(filename, { interval: 1000 }, (curr, prev) => {
    console.log('文件状态变化:');
    console.log('- 当前修改时间:', curr.mtime);
    console.log('- 之前修改时间:', prev.mtime);
});
```

## 4.2 流的概念与类型

### 流的基本概念

流（Stream）是Node.js中处理数据的抽象接口，特别适合处理大量数据。流可以让你逐块处理数据，而不需要将整个数据加载到内存中。

### 流的类型

```javascript
// stream-types.js - 流的类型演示

const { Readable, Writable, Transform, Duplex } = require('stream');

// 1. 可读流（Readable Stream）
class MyReadableStream extends Readable {
    constructor(options) {
        super(options);
        this.counter = 0;
    }
    
    _read() {
        if (this.counter < 5) {
            this.push(`数据块 ${this.counter}\n`);
            this.counter++;
        } else {
            this.push(null); // 结束流
        }
    }
}

const readableStream = new MyReadableStream();

readableStream.on('data', (chunk) => {
    console.log('接收到数据:', chunk.toString());
});

readableStream.on('end', () => {
    console.log('可读流结束');
});

// 2. 可写流（Writable Stream）
class MyWritableStream extends Writable {
    _write(chunk, encoding, callback) {
        console.log('写入数据:', chunk.toString());
        callback(); // 表示写入完成
    }
}

const writableStream = new MyWritableStream();

writableStream.write('Hello ');
writableStream.write('World!');
writableStream.end(); // 结束写入

// 3. 转换流（Transform Stream）
class UpperCaseTransform extends Transform {
    _transform(chunk, encoding, callback) {
        const upperCased = chunk.toString().toUpperCase();
        this.push(upperCased);
        callback();
    }
}

const transformStream = new UpperCaseTransform();

transformStream.on('data', (chunk) => {
    console.log('转换后的数据:', chunk.toString());
});

transformStream.write('hello world');
transformStream.end();

// 4. 双工流（Duplex Stream）
class MyDuplexStream extends Duplex {
    constructor(options) {
        super(options);
        this.data = [];
    }
    
    _read() {
        if (this.data.length > 0) {
            this.push(this.data.shift());
        } else {
            this.push(null);
        }
    }
    
    _write(chunk, encoding, callback) {
        this.data.push(chunk);
        callback();
    }
}
```

## 4.3 可读流详解

### 创建和使用可读流

```javascript
// readable-stream.js - 可读流详解

const fs = require('fs');
const { Readable } = require('stream');

// 1. 从文件创建可读流
const fileReadStream = fs.createReadStream('large-file.txt', {
    encoding: 'utf8',
    highWaterMark: 1024, // 缓冲区大小
    start: 0,            // 开始位置
    end: 2048            // 结束位置
});

fileReadStream.on('data', (chunk) => {
    console.log('读取到数据块，大小:', chunk.length);
});

fileReadStream.on('end', () => {
    console.log('文件读取完成');
});

fileReadStream.on('error', (err) => {
    console.error('读取错误:', err.message);
});

// 2. 自定义可读流
class NumberStream extends Readable {
    constructor(max, options) {
        super(options);
        this.max = max;
        this.current = 0;
    }
    
    _read() {
        if (this.current < this.max) {
            this.push(`${this.current}\n`);
            this.current++;
        } else {
            this.push(null); // 结束流
        }
    }
}

const numberStream = new NumberStream(10);

// 使用异步迭代器读取流
async function readStreamWithAsyncIterator() {
    try {
        for await (const chunk of numberStream) {
            console.log('异步迭代器读取:', chunk.toString().trim());
        }
    } catch (err) {
        console.error('读取错误:', err);
    }
}

// readStreamWithAsyncIterator();

// 3. 流的模式
// 流动模式（flowing mode）
const flowingStream = fs.createReadStream('example.txt');

flowingStream.on('data', (chunk) => {
    console.log('流动模式 - 数据:', chunk.toString());
});

// 暂停模式（paused mode）
const pausedStream = fs.createReadStream('example.txt');

pausedStream.on('readable', () => {
    let chunk;
    while (null !== (chunk = pausedStream.read())) {
        console.log('暂停模式 - 数据:', chunk.toString());
    }
});
```

## 4.4 可写流详解

### 创建和使用可写流

```javascript
// writable-stream.js - 可写流详解

const fs = require('fs');
const { Writable } = require('stream');

// 1. 创建文件写入流
const fileWriteStream = fs.createWriteStream('output.txt', {
    encoding: 'utf8',
    flags: 'w',          // 写入模式
    highWaterMark: 1024  // 缓冲区大小
});

// 写入数据
fileWriteStream.write('第一行数据\n');
fileWriteStream.write('第二行数据\n');

// 结束写入
fileWriteStream.end('最后一行数据\n');

fileWriteStream.on('finish', () => {
    console.log('写入完成');
});

fileWriteStream.on('error', (err) => {
    console.error('写入错误:', err.message);
});

// 2. 自定义可写流
class LogStream extends Writable {
    constructor(options) {
        super(options);
        this.logs = [];
    }
    
    _write(chunk, encoding, callback) {
        const log = {
            timestamp: new Date().toISOString(),
            data: chunk.toString().trim()
        };
        
        this.logs.push(log);
        console.log('日志记录:', log);
        
        callback(); // 表示写入完成
    }
    
    _final(callback) {
        console.log('总共记录了', this.logs.length, '条日志');
        callback();
    }
}

const logStream = new LogStream();

logStream.write('用户登录');
logStream.write('执行查询');
logStream.write('用户退出');
logStream.end();

// 3. 背压处理（Backpressure）
function writeWithBackpressure(stream, data) {
    return new Promise((resolve, reject) => {
        if (!stream.write(data)) {
            // 缓冲区满了，等待drain事件
            stream.once('drain', resolve);
            stream.once('error', reject);
        } else {
            resolve();
        }
    });
}

// 使用背压处理
async function writeLotsOfData() {
    const stream = fs.createWriteStream('big-file.txt');
    
    for (let i = 0; i < 1000000; i++) {
        await writeWithBackpressure(stream, `数据行 ${i}\n`);
        
        if (i % 10000 === 0) {
            console.log(`已写入 ${i} 行`);
        }
    }
    
    stream.end();
    console.log('大文件写入完成');
}
```

## 4.5 管道操作与流组合

### 基本管道操作

```javascript
// pipe-operations.js - 管道操作

const fs = require('fs');
const { Transform, pipeline } = require('stream');
const zlib = require('zlib');

// 1. 基本管道操作
const readStream = fs.createReadStream('input.txt');
const writeStream = fs.createWriteStream('output.txt');

// 简单管道
readStream.pipe(writeStream);

readStream.on('end', () => {
    console.log('管道操作完成');
});

// 2. 链式管道
const gzipStream = zlib.createGzip();

fs.createReadStream('input.txt')
  .pipe(gzipStream)                    // 压缩
  .pipe(fs.createWriteStream('output.txt.gz'));

// 3. 自定义转换流
class LineNumberTransform extends Transform {
    constructor(options) {
        super(options);
        this.lineNumber = 1;
    }
    
    _transform(chunk, encoding, callback) {
        const lines = chunk.toString().split('\n');
        const numberedLines = lines.map((line, index) => {
            if (index === lines.length - 1 && line === '') {
                return line; // 保持最后的空行
            }
            return `${this.lineNumber++}: ${line}`;
        });
        
        this.push(numberedLines.join('\n'));
        callback();
    }
}

// 使用自定义转换流
fs.createReadStream('input.txt')
  .pipe(new LineNumberTransform())
  .pipe(fs.createWriteStream('numbered-output.txt'));

// 4. 使用pipeline处理错误
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

async function processFileWithPipeline() {
    try {
        await pipelineAsync(
            fs.createReadStream('input.txt'),
            new LineNumberTransform(),
            zlib.createGzip(),
            fs.createWriteStream('processed.txt.gz')
        );
        console.log('Pipeline处理完成');
    } catch (error) {
        console.error('Pipeline处理失败:', error);
    }
}

// 5. 复杂的流组合
class WordCountTransform extends Transform {
    constructor(options) {
        super(options);
        this.wordCount = 0;
        this.lineCount = 0;
    }
    
    _transform(chunk, encoding, callback) {
        const text = chunk.toString();
        const lines = text.split('\n');
        
        this.lineCount += lines.length - 1; // 减1因为最后一个分割是空的
        
        const words = text.split(/\s+/).filter(word => word.length > 0);
        this.wordCount += words.length;
        
        this.push(chunk); // 传递原始数据
        callback();
    }
    
    _flush(callback) {
        const summary = `\n\n统计信息:\n行数: ${this.lineCount}\n单词数: ${this.wordCount}\n`;
        this.push(summary);
        callback();
    }
}

// 组合多个转换流
fs.createReadStream('input.txt')
  .pipe(new LineNumberTransform())
  .pipe(new WordCountTransform())
  .pipe(fs.createWriteStream('analyzed-output.txt'));
```

## 本章小结

本章我们深入学习了：

1. **文件系统API**：读写文件、目录操作、文件监听
2. **流的概念**：四种流类型及其特点
3. **可读流**：创建、使用和不同的读取模式
4. **可写流**：创建、背压处理和错误处理
5. **管道操作**：流的组合和复杂数据处理

## 练习题

1. 实现一个文件复制工具，支持进度显示
2. 创建一个日志分析器，统计不同级别的日志数量
3. 实现一个CSV文件处理器，支持数据转换
4. 创建一个文件压缩和解压缩工具

## 下一章预告

下一章我们将学习HTTP服务器与网络编程，了解如何创建Web服务器和处理网络请求。

---

[上一章：异步编程与事件循环](../chapter-03/) | [返回目录](../) | [下一章：HTTP服务器与网络编程](../chapter-05/)
