# 配色方案参考

## 使用说明

当生成 UI 模式的选项时，每个方案必须使用不同的配色方案。
从以下调色板中选择，确保方案之间有明显的视觉差异。

## 调色板库

### 1. 极光蓝 (Aurora Blue)

```css
:root {
  --bg: #f0f4ff;
  --surface: #ffffff;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --text: #0f172a;
  --text-secondary: #475569;
  --border: #cbd5e1;
  --accent: #06b6d4;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}
```

适用：企业后台、管理面板、专业工具

### 2. 暮光紫 (Twilight Purple)

```css
:root {
  --bg: #faf5ff;
  --surface: #ffffff;
  --primary: #7c3aed;
  --primary-hover: #6d28d9;
  --text: #1e1b4b;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
  --accent: #ec4899;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}
```

适用：创意工具、社交产品、年轻用户群

### 3. 森林绿 (Forest Green)

```css
:root {
  --bg: #f0fdf4;
  --surface: #ffffff;
  --primary: #059669;
  --primary-hover: #047857;
  --text: #052e16;
  --text-secondary: #4b5563;
  --border: #d1d5db;
  --accent: #14b8a6;
  --success: #22c55e;
  --warning: #eab308;
  --danger: #dc2626;
}
```

适用：健康/环保/金融产品

### 4. 焦糖橙 (Caramel Orange)

```css
:root {
  --bg: #fff7ed;
  --surface: #ffffff;
  --primary: #ea580c;
  --primary-hover: #c2410c;
  --text: #1c1917;
  --text-secondary: #78716c;
  --border: #d6d3d1;
  --accent: #f59e0b;
  --success: #16a34a;
  --warning: #ca8a04;
  --danger: #dc2626;
}
```

适用：电商、美食、生活服务

### 5. 暗夜深蓝 (Midnight Dark)

```css
:root {
  --bg: #0f172a;
  --surface: #1e293b;
  --primary: #60a5fa;
  --primary-hover: #93c5fd;
  --text: #f1f5f9;
  --text-secondary: #94a3b8;
  --border: #334155;
  --accent: #a78bfa;
  --success: #34d399;
  --warning: #fbbf24;
  --danger: #fb7185;
}
```

适用：数据监控、开发者工具、夜间模式

### 6. 赛博朋克 (Cyberpunk)

```css
:root {
  --bg: #0a0a0f;
  --surface: #14141f;
  --primary: #e040fb;
  --primary-hover: #ce93d8;
  --text: #f5f5f5;
  --text-secondary: #9e9e9e;
  --border: #2a2a3a;
  --accent: #00e5ff;
  --success: #76ff03;
  --warning: #ffd600;
  --danger: #ff1744;
}
```

适用：游戏、科技产品、创意展示

### 7. 奶油极简 (Cream Minimal)

```css
:root {
  --bg: #fffbf5;
  --surface: #ffffff;
  --primary: #1a1a1a;
  --primary-hover: #333333;
  --text: #1a1a1a;
  --text-secondary: #737373;
  --border: #e5e5e5;
  --accent: #8b5cf6;
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
}
```

适用：博客、阅读、内容型产品

### 8. 珊瑚红 (Coral Red)

```css
:root {
  --bg: #fff1f2;
  --surface: #ffffff;
  --primary: #e11d48;
  --primary-hover: #be123c;
  --text: #1c1917;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
  --accent: #f97316;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #dc2626;
}
```

适用：社交、娱乐、热点内容

## 使用规则

1. **每次生成至少使用 2 种不同的调色板** — 不要让所有方案看起来像同一主题的微调
2. **根据场景选色** — 电商用暖色，后台用冷色，创意产品用亮色
3. **优先选择对比度高的组合** — 方案 A 暖色 vs 方案 B 冷色 vs 方案 C 暗色
4. **可以微调但不要混搭** — 选定一个调色板后可以微调色值，但不要把两个调色板混在一起
5. **深色方案至少保留一个** — 如果生成 3 个方案，其中一个应该是深色主题
