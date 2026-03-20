# ai通讯方式
通讯方式，基本各个厂商都遵循OpenAPI规范

## 使用fetch非流式

``` js
  const endpoint = 'https://api.deepseek.com/chat/completions';
    const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`
  };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: question.value }],
        stream: false,
      })
    });
    const data = await response.json(); // 会等所有文本返回后，体验差
    content.value = data.choices[0].message.content
```

## 使用fetch流式

``` js

const endpoint = 'https://api.deepseek.com/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: question.value }],
      stream: true,
    })
  });


    content.value = '';

    const reader = response.body?.getReader(); // 使用 getReader
    const decoder = new TextDecoder();
    let done = false;
    let buffer = '';

    while (!done) {
      const { value, done: doneReading } = await (reader?.read() as Promise<{ value: any; done: boolean }>);
      done = doneReading;
      const chunkValue = buffer + decoder.decode(value);
      buffer = '';

      const lines = chunkValue.split('\n').filter((line) => line.startsWith('data: '));

      for (const line of lines) {
        const incoming = line.slice(6);
        if (incoming === '[DONE]') {
          done = true;
          break;
        }
        try {
          const data = JSON.parse(incoming);
          const delta = data.choices[0].delta.content;
          if (delta) content.value += delta;
        } catch (err) {
          buffer += `data: ${incoming}`;
          console.error('err', err)
        }
      }
    }
```

## SSE

::: tip
new EventSource 只支持get, 需要后端转发， 但是前端逻辑简单
:::


前端代码
``` js

    const endpoint = '/api/stream';
    const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`
  };
    content.value = '';
    const eventSource = new EventSource(`${endpoint}?question=${question.value}`);
    eventSource.addEventListener("message", function (e: any) {
      content.value += e.data;
    });
    eventSource.addEventListener('end', () => { eventSource.close(); });
```

后端代码

``` js

app.get('/stream', async (req, res) => {
    // 设置响应头部
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // 发送初始响应头

    try {
        // 发送 OpenAI 请求
        const response = await fetch(
            endpoint,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiApiKey}`,
                },
                body: JSON.stringify({
                    model: 'deepseek-chat', // 选择你使用的模型
                    messages: [{ role: 'user', content: req.query.question }],
                    stream: true, // 开启流式响应
                })
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch from OpenAI');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let buffer = '';

        // 读取流数据并转发到客户端
        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = buffer + decoder.decode(value, { stream: true });
            buffer = '';

            // 按行分割数据，每行以 "data: " 开头，并传递给客户端
            const lines = chunkValue.split('\n').filter(line => line.trim() && line.startsWith('data: '));
            for (const line of lines) {
                const incoming = line.slice(6);
                if (incoming === '[DONE]') {
                    done = true;
                    break;
                }
                try {
                    const data = JSON.parse(incoming);
                    const delta = data.choices[0].delta.content;
                    if (delta) res.write(`data: ${delta}\n\n`); // 发送数据到客户端
                } catch (ex) {
                    buffer += `data: ${incoming}`;
                }
            }
        }

        res.write('event: end\n'); // 发送结束事件
        res.write('data: [DONE]\n\n'); // 通知客户端数据流结束
        res.end(); // 关闭连接

    } catch (error) {
        console.error('Error fetching from OpenAI:', error);
        res.write('data: Error fetching from OpenAI\n\n');
        res.end();
    }
});
```