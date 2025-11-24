# 堆
1. 堆是一种特殊的完全二叉树
    - 最大堆：所有节点都大于等于它的子节点
    - 最小堆：所有节点都小于等于它的子节点
2. js中可以使用数组表示堆，如果通过广度优先遍历放入数组中，有以下规则
    - 左侧子节点的位置是2 * index + 1
    - 右侧子节点的位置是2 * index + 2
    - 父节点的位置是（index - 1） / 2
3. 堆的应用
    - 快速找出最大值和最小值，时间复杂度O(1)
    - 找出第k个最大或最小值

## 最小堆实现

``` js
class MinHeap {
    constructor() {
        this.heap = []
    }

    swap(i1, i2) {
        const temp = this.heap[i1]
        this.heap[i1] = this.heap[i2]
        this.heap[i2] = temp
    }

    getParentIndex(index) {
        return (index - 1) >> 1
    }

    getLeftIndex(i) {
        return i * 2 + 1
    }

    getRightIndex(i) {
        return i * 2 + 2
    }

    shiftUp(index) {
        if (index === 0) return
        let parentIndex = this.getParentIndex(index)
        if (this.heap[parentIndex] > this.heap[index]) {
            this.swap(parentIndex, index)
            this.shiftUp(parentIndex)
        }
    }

    insert(val) {
        this.heap.push(val)
        this.shiftUp(this.heap.length - 1)
    }

    shiftDown(index){
        const leftIndex = this.getLeftIndex(index)
        const rightIndex = this.getRightIndex(index)
        if(this.heap[leftIndex] < this.heap[index]) {
            this.swap(leftIndex,index)
            this.shiftDown(leftIndex)
        }
        if(this.heap[rightIndex] < this.heap[index]) {
            this.swap(rightIndex,index)
            this.shiftDown(rightIndex)
        }
    }

    pop() {
            this.heap[0] = this.heap.pop(
            this.shiftDown(0)
        )
    }

    peek() {
        return this.heap[0]
    }

    size() {
        return this.heap.length
    }
}
````