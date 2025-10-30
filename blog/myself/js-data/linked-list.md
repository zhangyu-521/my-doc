# 链表

- 链表（Linked List）是一种物理上非连续、逻辑上连续的线性数据结构，由一系列节点（Node）组成，每个节点通过指针（引用）指向下一节点。
- 在 JavaScript 中，没有内建链表类，但可以用对象/类手动实现。
- 原型链就是链表结构，__proto__ 就是next指针


## 单向链表
``` js
class ListNode {
    constructor(val, next = null) {
        this.val = val;
        this.next = null;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    // 尾插O(1)
    append(val) {
        const node = new ListNode(val);
        if(!this.head) {
            this.head = this.tail = node;
        } else {
            this.tail.next = node
            this.tail = node;
            
        }
        this.size++;
    }

    // 头插O(1)
    prepend(val) {
        const node = new ListNode(val, this.head);
        this.head = node;
        if(!this.tail)this.tail = node;
        this.size++;
    }

    // 删除第一个值等于val的节点O(n)
    delete(val) {
        if(!this.head)return false
        if(this.head.val === val) {
            this.head = this.head.next;
            if(!this.head)this.tail = null;
            this.size--;
            return true;
        }
        let cur = this.head;
        while(cur.next && cur.next.val !== val) cur = cur.next;
        if(cur.next) {
            if(cur.next === this.tail)this.tail = cur;
            cur.next = cur.next.next;
            this.size--;
            return true;
        }
        reeturn false;
    }

    // 转数组打印
    toArray() {
        const arr = []
        let cur = this.head
        while(cur) {
            arr.push(cur.val)
            cur = cur.next
        }
        return arr
    }

}
```

## 双向链表
``` js
class DNode {
    constructor(val) {
        this.val = val;
        this.next = null;
        this.prev = null;
    }
}

```
- 每个节点多一个 prev 指针
- LeetCode 146 LRU 缓存机制必须用双向链表 + Map 实现


## 实现instanceOf
``` js
function myInstanceof(obj, Fn) {
    while(obj) {
        if(obj === Fn.prototype)return true
        obj = obj.__proto__
    }
    return false
}
```



