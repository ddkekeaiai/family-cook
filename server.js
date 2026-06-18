const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 57525;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(__dirname));

// 读取数据
function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch(e) { return { recipes: [], mealPlans: [], preferences: { liked: [], disliked: [] } }; }
}

// 保存数据
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ====== API ======

// 获取全部数据
app.get('/api/data', (req, res) => {
  res.json(loadData());
});

// 获取菜谱列表
app.get('/api/recipes', (req, res) => {
  const data = loadData();
  res.json(data.recipes || []);
});

// 新增/更新菜谱
app.post('/api/recipes', (req, res) => {
  const data = loadData();
  const recipe = req.body;
  const idx = (data.recipes || []).findIndex(r => r.id === recipe.id);
  if (idx >= 0) {
    data.recipes[idx] = recipe;
  } else {
    data.recipes.push(recipe);
  }
  saveData(data);
  res.json({ success: true });
});

// 删除菜谱
app.delete('/api/recipes/:id', (req, res) => {
  const data = loadData();
  data.recipes = (data.recipes || []).filter(r => r.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// 获取排程
app.get('/api/plans', (req, res) => {
  const data = loadData();
  res.json(data.mealPlans || []);
});

// 保存排程
app.post('/api/plans', (req, res) => {
  const data = loadData();
  data.mealPlans = req.body;
  saveData(data);
  res.json({ success: true });
});

// 保存全部数据
app.post('/api/data', (req, res) => {
  saveData(req.body);
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin.html`);
  console.log(`User:  http://localhost:${PORT}/index.html`);
});
