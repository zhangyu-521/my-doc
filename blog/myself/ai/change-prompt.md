# 动态的提示词

使用 `nunjucks` 可以动态更换提示词。

``` js
import nunjucks from "nunjucks";
const today = ref(new Date().toISOString().split("T")[0]);
const systemPrompt = ` 
今天的日期是 {{today}}

针对今天的日期、节日、节气等信息，整理出以下内容：

1. 今天的日期如果是特殊节日，介绍节日的文化和意义，以及节日的历史和背景。
2. 今天的日期如果是特殊节气，介绍节气的文化和意义，以及节气的历史和背景。
3. 今天的日期如果在历史上的重要事件中，介绍该事件的文化和意义，以及该事件的历史和背景。
` 

  const prompt = nunjucks.renderString(systemPrompt, {
    today: today.value,
  });


  const apiKey = import.meta.env.VITE_KIMI_API_KEY;
  const endpoint = 'https://api.moonshot.cn/v1/chat/completions';
  const model = 'moonshot-v1-8k';

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };


  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model,
      messages: [
        { role:'system', content: prompt},
        { role: 'user', content: "介绍今天相关的知识" }
      ],
      stream: true,
    })
  });

  const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = '';
    reply.value = '';

    while (!done) {
      const { value, done: doneReading } = await (reader?.read() as Promise<{ value: any; done: boolean }>);
      done = doneReading;
      const chunkValue = buffer + decoder.decode(value);

      const lines = chunkValue.split('\n').filter((line) => line.startsWith('data: '));

      for (const line of lines) {
        const incoming = line.slice(6);
        if(incoming === '[DONE]') {
          done = true;
          break;
        }
        try {
          const data = JSON.parse(incoming);
          const delta = data.choices[0].delta.content;
          if(delta) reply.value += delta;
        } catch(ex) {
          console.log(ex)
          buffer += incoming + '\n';
        }
      }
    }
```


可以让ai输出json格式,使用一个库优化输出格式
``` js
const systemPrompt = `
根据用户输入的主题，用**中文**输出以下JSON格式内容：

{
  "story_instruction": "",
  "the_whole_story_content": "",
  "the_whole_story_translate_to_en": "",
  "lessons": []
}
`;
```