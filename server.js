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
  catch(e) {
    const defaultData = {
      recipes: [
        {id:'r1',name:'鱼香肉丝',category:'热菜',tips:'经典川菜'},
        {id:'r2',name:'西红柿炒鸡蛋',category:'热菜',tips:'国民家常菜'},
        {id:'r3',name:'红烧排骨',category:'热菜',tips:'炖久一点更入味'},
        {id:'r4',name:'蒜蓉西兰花',category:'凉菜',tips:'清爽可口'},
        {id:'r5',name:'麻婆豆腐',category:'热菜',tips:'麻辣鲜香'},
        {id:'r6',name:'紫菜蛋花汤',category:'汤',tips:'简单快手汤'},
        {id:'r7',name:'糖醋里脊',category:'热菜',tips:'酸甜可口'},
        {id:'r8',name:'水果沙拉',category:'水果',tips:'加蜂蜜更好吃'},
        {id:'r9',name:'皮蛋瘦肉粥',category:'早餐',tips:'淋几滴香油更香'},
        {id:'r10',name:'豆浆油条',category:'早餐',tips:'经典搭配'},
        {id:'r11',name:'玉米排骨汤',category:'汤',tips:'炖汤一次加足水'},
        {id:'r12',name:'柠檬蜂蜜水',category:'饮品',tips:'水温别超60度'}
      ],
      restaurants: [
        {id:'res1',name:'川味轩',category:'炒菜',tips:'水煮鱼正宗'},
        {id:'res2',name:'新疆羊肉串',category:'烧烤',tips:'红柳大串必点'},
        {id:'res3',name:'沙县小吃',category:'快餐',tips:'经济实惠'},
        {id:'res4',name:'巴蜀火锅',category:'串火',tips:'越煮越香'},
        {id:'res5',name:'兰州拉面',category:'粉面',tips:'汤鲜味美'},
        {id:'res6',name:'粤式茶餐厅',category:'小吃',tips:'虾饺烧卖绝了'}
      ],
      mealPlans: [],
      preferences: {liked:[],disliked:[]}
    };
    saveData(defaultData);
    return defaultData;
  }
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
