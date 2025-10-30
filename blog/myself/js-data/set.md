# 集合

“集合” 通常指的是 Set 这种 内建的集合数据结构，它专门用来存储 唯一值（不允许重复）。

``` js
const set = new Set();

set.add(1);
set.add(2);
set.add(2); // 重复值，自动忽略

console.log(set); // Set(2) { 1, 2 }

// 可迭代
const set = new Set([1, 2, 3]);

for (const val of set) {
  console.log(val); // 1 2 3
}

// 或
console.log([...set]); // [1, 2, 3]
```

## 去重神器
``` js
const arr = [1, 2, 2, 3, 4, 4];
const unique = [...new Set(arr)];
console.log(unique); // [1, 2, 3, 4]
```

## 集合运算
``` js
// 交集
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

const intersect = new Set([...a].filter(x => b.has(x)));
console.log(intersect); // Set(2) { 2, 3 }

// 并集
const union = new Set([...a, ...b]);
console.log(union); // Set(4) { 1, 2, 3, 4 }

// 差集
const diff = new Set([...a].filter(x => !b.has(x)));
console.log(diff); // Set(1) { 1 }
```