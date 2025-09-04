## Blob
在 JavaScript 中，Blob（Binary Large Object）是一种用于表示不可变的二进制数据的对象。

## 创建Blob
可以通过 Blob 构造函数来创建一个 Blob 对象。构造函数接受两个参数：
- parts: 一个数组，包含要组合成 Blob 的数据片段。数组中的每个元素可以是以下类型：
  - ArrayBuffer 表示二进制数据的数组缓冲区。
  - ArrayBufferView （如 Uint8Array、Int16Array 等）：一个基于 ArrayBuffer 的视图，用于操作二进制数据。
  - Blob 另一个 Blob 对象，可以将多个 Blob 合并到一个新的 Blob 中。
  - String 一个字符串，表示文本数据。
- options: 一个可选的对象，用于指定 Blob 的 MIME 类型和其他属性。
  - type: 一个字符串，表示 Blob 的 MIME 类型（如 "text/plain"、"image/png" 等）。如果不指定，默认为 "application/octet-stream"，表示二进制数据。
``` md
常见的MIME类型
- text/plain: 普通文本
- text/html: HTML 文档
- text/css: CSS 样式表
- application/json: JSON 数据
- application/javascript: JavaScript 代码
- image/png: PNG 图像
- image/jpeg: JPEG 图像
- audio/mpeg: MP3 音频
- video/mp4: MP4 视频
- application/pdf: PDF 文件
- application/octet-stream: 二进制数据（默认值）
```
### 示例代码
``` js
// 创建一个包含文本数据的 Blob
const textBlob = new Blob(["Hello, world!"], { type: "text/plain" });

// 创建一个包含二进制数据的 Blob
const uint8Array = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" 的 ASCII 码
const binaryBlob = new Blob([uint8Array], { type: "application/octet-stream" });

// 合并多个 Blob
const combinedBlob = new Blob([textBlob, binaryBlob]);
```

## Blob属性
- size: Blob 的大小（以字节为单位）。
- type: Blob 的 MIME 类型, 与创建时指定的 type 一致。
### 示例代码
``` js
console.log(textBlob.size); // 输出：13
console.log(textBlob.type); // 输出：text/plain
```

## Blob方法
- slice(start, end, contentType): 返回一个新的 Blob 对象，该对象包含原始 Blob 中从 start 到 end（不包括 end）之间的数据片段。可以指定新的 MIME 类型 contentType。
 - start: 截取的起始位置，从 0 开始。如果省略，默认为 0。
 - end: 截取的结束位置（不包括该位置）。如果省略，默认为 Blob 的末尾。
 - contentType: 可选，指定新 Blob 的 MIME 类型。如果不指定，默认与原 Blob 的类型一致。
- stream(): 返回一个可读的 ReadableStream 对象，用于读取 Blob 中的数据。
- text(): 返回一个 Promise 对象，该 Promise 在解析 Blob 中的文本数据时解决。
- arrayBuffer(): 返回一个 Promise 对象，该 Promise 在解析 Blob 中的二进制数据为 ArrayBuffer 时解决。
- toString(): 返回 Blob 的 MIME 类型。
### 示例代码
``` js
// 截取 Blob 的数据片段
const slicedBlob = combinedBlob.slice(0, 5, "text/plain");

// 读取 Blob 的文本数据
combinedBlob.text().then(data => {
  console.log(data); // 输出：Hello, world!
});

// 读取 Blob 的二进制数据
combinedBlob.arrayBuffer().then(buffer => {
    
})
```

## Blob使用场景
- 文件上传
``` js
const fileInput = document.querySelector("input[type='file']");
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  const blob = new Blob([file], { type: file.type });

  // 使用 FormData 发送 Blob 到服务器
  const formData = new FormData();
  formData.append("file", blob, file.name);

  fetch("https://example.com/upload", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => console.log(data))
    .catch((error) => console.error(error));
});
```
- 动态生成文件
``` js
const text = "This is a dynamically generated file.";
const blob = new Blob([text], { type: "text/plain" });

// 创建一个可下载的链接
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "file.txt";
a.click();

// 释放对象 URL
URL.revokeObjectURL(url);
```

- 处理多媒体数据
``` js
fetch("https://example.com/image.png")
  .then((response) => response.blob())
  .then((blob) => {
    const url = URL.createObjectURL(blob);
    const img = document.createElement("img");
    img.src = url;
    document.body.appendChild(img);

    // 释放对象 URL
    URL.revokeObjectURL(url);
  })
  .catch((error) => console.error(error));
```

## Blob注意事项
- Blob 是不可变的，一旦创建，其内容不能修改。如果需要修改数据，可以创建一个新的 Blob。
- 使用 URL.createObjectURL 创建的对象 URL 需要在适当的时候释放，以避免内存泄漏。可以通过 URL.revokeObjectURL 方法释放对象 URL。
- 在处理大文件时，需要注意性能问题。尽量避免频繁地创建和操作大 Blob 对象。
