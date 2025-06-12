# axios是怎样取消请求的

## 1. 通过CancelToken取消请求

axios的取消请求是通过`CancelToken`来实现的，`CancelToken`是一个构造函数，它接受一个executor函数作为参数，这个executor函数接受一个`cancel`函数作为参数，这个`cancel`函数可以用来取消请求。
```js
// 创建一个 CancelToken 源
const CancelToken = axios.CancelToken;
const source = CancelToken.source();

const request = axios.get('https://api.example.com', {
  cancelToken: source.token,
});

// 在某个时间点取消请求
setTimeout(() => {
  source.cancel('Operation canceled by the user.');
}, 1000);

request
  .then((response) => {
    console.log('Response:', response.data);
  })
  .catch((error) => {
    if (axios.isCancel(error)) {
      console.log('Request was canceled:', error.message);
    } else {
      console.error('Request error:', error);
    }
  });
```

## 源码简单实现
原理就是通过一个promise来控制请求是否取消，通过resolve来取消请求，在请求中监听这个promise，如果promise被resolve了，那么就取消请求。（不得不说还是妙啊）
``` js
class CancelToken {
  resolve;
  cancelPromise = new Promise((resolve, regect) => {
    this.resolve = resolve;
  });

  cancel(reson) {
    this.resolve(reson);
  }
}

const cancelTokenIns = new CancelToken();


new Promise((resolve, reject) => {
    // 调用cancel会触发resolve，从而触发下面then里面的函数
  cancelTokenIns.cancelPromise.then((reson) => {
    console.log('取消原因', reson);
    reject();
  });
  setTimeout(() => {
    resolve();
  }, 2000);
})
  .then(() => {
    console.log('发送请求');
  })
  .catch(() => {
    console.log('请求被取消');
  });


  setTimeout(() => {
    cancelTokenIns.cancel('取消');
  },1000)

```

## 2.  使用 AbortController
`AbortController` 是现代浏览器提供的一个内置 `API，用于取消异步操作。axios` 支持通过 `AbortController` 来取消请求。

``` js
const controller = new AbortController();
const signal = controller.signal;

const request = axios.get('https://api.example.com', { signal });

// 在某个时间点取消请求
setTimeout(() => {
  controller.abort();
}, 1000);

request
  .then((response) => {
    console.log('Response:', response.data);
  })
  .catch((error) => {
    if (error.name === 'AbortError') {
      console.log('Request was aborted');
    } else {
      console.error('Request error:', error);
    }
  });
```

然而 `AbortController`还可以做到更多，比如取消 `fetch` 请求，还可以用于取消事件监听器、流操作、WebSocket 连接、定时器、DOM 操作和 `IntersectionObserver` 等

## 取消多个fetch
``` js
const controller = new AbortController();
const signal = controller.signal;

// 第一个 fetch 请求
fetch('https://api.example.com/data1', { signal })
  .then(response => response.json())
  .then(data => console.log('Data 1:', data))
  .catch(error => {
    if (error.name === 'AbortError') {
      console.log('Fetch 1 was aborted');
    } else {
      console.error('Fetch 1 error:', error);
    }
  });

// 第二个 fetch 请求
fetch('https://api.example.com/data2', { signal })
  .then(response => response.json())
  .then(data => console.log('Data 2:', data))
  .catch(error => {
    if (error.name === 'AbortError') {
      console.log('Fetch 2 was aborted');
    } else {
      console.error('Fetch 2 error:', error);
    }
  });

// 取消所有请求
setTimeout(() => {
  controller.abort();
  console.log('All fetch requests aborted');
}, 2000);
```

## 取消事件监听器
`AbortController` 可以用于取消事件监听器，避免内存泄漏或不必要的事件处理。

``` js
const controller = new AbortController();
const signal = controller.signal;

// 监听事件
window.addEventListener('click', () => {
  console.log('Window clicked');
}, { signal });

// 取消事件监听
setTimeout(() => {
  controller.abort();
  console.log('Event listener removed');
}, 2000);
```

## 取消流操作
`AbortController` 可以用于取消 `ReadableStream` 或 `WritableStream` 的操作。这对于处理文件上传、下载或流式数据处理非常有用。
``` js
const controller = new AbortController();
const signal = controller.signal;

const reader = new ReadableStream({
  start(controller) {
    // 模拟数据流
    setTimeout(() => {
      controller.enqueue(new TextEncoder().encode('Hello'));
    }, 1000);
    setTimeout(() => {
      controller.enqueue(new TextEncoder().encode(' World'));
    }, 2000);
    setTimeout(() => {
      controller.close();
    }, 3000);
  }
});

const readerStream = reader.getReader({ signal });

readerStream.read().then(({ value, done }) => {
  if (done) {
    console.log('Stream finished');
  } else {
    console.log('Stream data:', value);
  }
}).catch(error => {
  if (error.name === 'AbortError') {
    console.log('Stream was aborted');
  } else {
    console.error('Stream error:', error);
  }
});

// 取消流操作
setTimeout(() => {
  controller.abort();
  console.log('Stream aborted');
}, 1500);
```

## 取消 WebSocket 连接
虽然 `WebSocket` 没有直接支持 `AbortController`，但可以通过自定义逻辑来模拟取消行为。
::: tip
调用 controller.abort() ; 触发 signal 的 abort 事件，从而触发 onabort 事件，从而关闭 socket 连接
这种自定义的玩法，可以取消任何异步操作
:::
``` js
const controller = new AbortController();
const signal = controller.signal;

const socket = new WebSocket('wss://example.com/socket');

socket.onmessage = (event) => {
  console.log('Message from server:', event.data);
};

socket.onopen = () => {
  console.log('WebSocket connected');
};

socket.onclose = () => {
  console.log('WebSocket closed');
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// 模拟取消 WebSocket 连接
signal.addEventListener('abort', () => {
  socket.close();
  console.log('WebSocket connection aborted');
});

// 取消 WebSocket 连接
setTimeout(() => {
  controller.abort();
}, 2000);
```

同样的取消定时器也是同样的原理,和取消dom操作也是同样的原理

``` js
const controller = new AbortController();
const signal = controller.signal;

let timerId;

signal.addEventListener('abort', () => {
  clearTimeout(timerId);
  console.log('Timer aborted');
});

timerId = setTimeout(() => {
  console.log('Timer fired');
}, 2000);

// 取消定时器
setTimeout(() => {
  controller.abort();
}, 1000);
```

## 取消 IntersectionObserver
``` js
const controller = new AbortController();
const signal = controller.signal;

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      console.log('Element is visible');
    }
  });
}, { signal });

const element = document.getElementById('myElement');
observer.observe(element);

// 取消观察
setTimeout(() => {
  controller.abort();
  console.log('IntersectionObserver aborted');
}, 2000);
```
