
// 在浏览器控制台执行以下代码进行测试

// 1. 设置 token
localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZW5saW44ZG9nIiwidXNlcl9pZCI6MTcsImV4cCI6MTc3MTc2NDQ4Nn0.BTzohou-3ZGpPHqysnYq8MspfWaQHB9ZgfGQf7etugs');

// 2. 测试获取食物类型
fetch('http://localhost:8000/api/v1/food/types')
  .then(r => r.json())
  .then(d => console.log('食物类型:', d));

// 3. 测试获取食物背包
fetch('http://localhost:8000/api/v1/food/inventory', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
  .then(r => r.json())
  .then(d => console.log('食物背包:', d));

// 4. 测试获取宠物
fetch('http://localhost:8000/api/v1/pets/my', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
  .then(r => r.json())
  .then(d => console.log('我的宠物:', d));

// 5. 测试获取金币余额
fetch('http://localhost:8000/api/v1/coins/balance', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
  .then(r => r.json())
  .then(d => console.log('金币余额:', d));
