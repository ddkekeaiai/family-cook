const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 57525;
const DATA_FILE = path.join(__dirname, 'data.json');

// Token 签名密钥（首次启动自动生成）
const SECRET_FILE = path.join(__dirname, '.secret');
let SECRET_KEY;
try { SECRET_KEY = fs.readFileSync(SECRET_FILE, 'utf8').trim(); }
catch(e) {
  SECRET_KEY = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, SECRET_KEY, 'utf8');
}

const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天

app.use(express.json());
app.use(express.static(__dirname));

// 密码哈希
function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

// 签发 token
function createToken(role) {
  const payload = { role, exp: Date.now() + TOKEN_EXPIRY };
  const sig = crypto.createHmac('sha256', SECRET_KEY).update(JSON.stringify(payload)).digest('hex');
  return Buffer.from(JSON.stringify({ ...payload, sig })).toString('base64');
}

// 验证 token（返回 null 或 payload）
function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const { sig, ...rest } = payload;
    const expected = crypto.createHmac('sha256', SECRET_KEY).update(JSON.stringify(rest)).digest('hex');
    if (sig !== expected) return null;
    if (rest.exp < Date.now()) return null;
    return rest;
  } catch(e) { return null }
}

// 读取数据
function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch(e) {
    const defaultData = {
      _config: { adminPasswordHash: hashPassword('admin123') },
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

// ====== 管理端写接口保护中间件 ======
function requireAdmin(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ success: false, message: '请先以管理员身份登录' });
  }
  next();
}

// 获取全部数据（公开）
app.get('/api/data', (req, res) => {
  res.json(loadData());
});

// 获取菜谱列表（公开）
app.get('/api/recipes', (req, res) => {
  const data = loadData();
  res.json(data.recipes || []);
});

// 新增/更新菜谱（需管理员）
app.post('/api/recipes', requireAdmin, (req, res) => {
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

// 删除菜谱（需管理员）
app.delete('/api/recipes/:id', requireAdmin, (req, res) => {
  const data = loadData();
  data.recipes = (data.recipes || []).filter(r => r.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// 获取排程（公开）
app.get('/api/plans', (req, res) => {
  const data = loadData();
  res.json(data.mealPlans || []);
});

// 保存排程（需管理员）
app.post('/api/plans', requireAdmin, (req, res) => {
  const data = loadData();
  data.mealPlans = req.body;
  saveData(data);
  res.json({ success: true });
});

// 保存全部数据（需管理员）
app.post('/api/data', requireAdmin, (req, res) => {
  saveData(req.body);
  res.json({ success: true });
});

// ====== 登录认证 API ======

// 管理员登录
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.json({ success: false, message: '请输入密码' });
  const data = loadData();
  const config = data._config || {};
  if (hashPassword(password) !== config.adminPasswordHash) {
    return res.json({ success: false, message: '密码错误' });
  }
  res.json({ success: true, token: createToken('admin'), role: 'admin' });
});

// 家庭成员登录（需密码验证，生成只读 token）
app.post('/api/login-member', (req, res) => {
  const { password } = req.body;
  if (!password) return res.json({ success: false, message: '请输入密码' });
  const data = loadData();
  const config = data._config || {};
  if (hashPassword(password) !== config.adminPasswordHash) {
    return res.json({ success: false, message: '密码错误' });
  }
  res.json({ success: true, token: createToken('member'), role: 'member' });
});

// 验证 token
app.post('/api/verify-token', (req, res) => {
  const token = req.body.token || req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.json({ valid: false });
  const payload = verifyToken(token);
  if (!payload) return res.json({ valid: false });
  res.json({ valid: true, role: payload.role });
});

// 修改管理员密码（需 admin token）
app.post('/api/change-password', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ success: false, message: '无权限' });
  }
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.json({ success: false, message: '请填写旧密码和新密码' });
  }
  if (newPassword.length < 4) {
    return res.json({ success: false, message: '新密码至少4位' });
  }
  const data = loadData();
  const config = data._config || {};
  if (hashPassword(oldPassword) !== config.adminPasswordHash) {
    return res.json({ success: false, message: '旧密码错误' });
  }
  data._config = { ...config, adminPasswordHash: hashPassword(newPassword) };
  saveData(data);
  res.json({ success: true, message: '密码已修改' });
});

// ====== 登录认证 API ======

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin.html`);
  console.log(`User:  http://localhost:${PORT}/index.html`);
  console.log(`Login: http://localhost:${PORT}/login.html`);
});
