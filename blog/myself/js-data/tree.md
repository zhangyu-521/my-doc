# 树
- DOM树
- 级联组件
- 树形控件


## 深度优先遍历
- 尽可能深的搜索树的分支
::: tip
    访问根节点
    对根节点的子节点挨个进行深度优先遍历
:::

``` js
function dfs(root) {
    console.log(root.val);
    root.children.forEach(dfs);
}
```

## 广度优先遍历
- 先访问离根节点最近的节点
::: tip
    新建一个队列，将根节点入队
    把队头出队并访问
    把队头节点的子节点入队
    重复步骤2和3，直到队列为空
:::

``` js
function bfs(root) {
    const q = [root]
    while (q.length) {
        const node = q.shift();
        console.log(node.val);
        node.children.forEach(child => q.push(child));
    }
}
```

## 二叉树

- 二叉树（Binary Tree）是每个节点最多有两个子树的树结构。


## 二叉的先中后序遍历

- 先序遍历：根节点 -> 左子树 -> 右子树
- 中序遍历：左子树 -> 根节点 -> 右子树
- 后序遍历：左子树 -> 右子树 -> 根节点

### 递归写法
``` js
// 先序遍历
function preorder(root) {
    if(root) {
        console.log(root.val);
        preorder(root.left);
        preorder(root.right);
    }
}

// 中序遍历
function inorder(root) {
    if(root) {
        inorder(root.left);
        console.log(root.val);
        inorder(root.right);
    }
}

// 后序遍历
function postorder(root) {
    if(root) {
        postorder(root.left);
        postorder(root.right);
        console.log(root.val);
    }
}
```


### 非递归遍历
``` js
// 先
function preorder(root) {
    if(!root)return
    const stack = [root]
    while(stack.length) {
        const node = stack.pop()
        console.log(node.val)
        if(node.right) stack.push(node.right)
        if(node.left) stack.push(node.left)
    }
}

// 中
function inorder(root) { 
    if(!root)return
    const stack = []
    let p = root
    while(stack.length || p) { 
       while(p) { 
        stack.push(p)
        p = p.left
       }
       const n = stack.pop()
       console.log(n.val)
       p = n.right
    }
}

// 后
function postorder(root) { 
    if(!root)return
    const outputStack = []
    const stack = [root]
    while(stack.length) {
        const node = stack.pop()
        outputStack.push(node)
        if(node.left) stack.push(node.left)
        if(node.right) stack.push(node.right)
    }
    while(outputStack.length) {
        const node = outputStack.pop()
        console.log(node.val)
    }
}
```


