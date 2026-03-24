/**
 * 为现有用户创建默认柴犬宠物的脚本
 * 用于测试和初始化
 */

const API_BASE = 'http://localhost:8000/api/v1';

async function createDefaultPet() {
  try {
    // 1. 从 localStorage 获取 token
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) {
      console.error('❌ 未找到认证信息，请先登录');
      return;
    }
    
    const authData = JSON.parse(authStorage);
    const token = authData.state.token;
    
    if (!token) {
      console.error('❌ Token 不存在');
      return;
    }
    
    console.log('✅ Token 获取成功');
    
    // 2. 检查是否已有宠物
    console.log('🔍 检查现有宠物...');
    const checkResponse = await fetch(`${API_BASE}/pets/my`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!checkResponse.ok) {
      throw new Error(`检查宠物失败: ${checkResponse.statusText}`);
    }
    
    const checkData = await checkResponse.json();
    
    if (checkData.pets && checkData.pets.length > 0) {
      console.log('ℹ️ 你已经有宠物了:', checkData.pets[0].name);
      console.log('宠物类型:', checkData.pets[0].petType);
      console.log('等级:', checkData.pets[0].level);
      return;
    }
    
    // 3. 创建柴犬
    console.log('🐕 创建默认柴犬...');
    const createResponse = await fetch(`${API_BASE}/pets/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pet_type: 'dog_shiba',
        pet_style: 'cute',
        name: '小柴'
      })
    });
    
    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`创建宠物失败: ${errorData.detail || createResponse.statusText}`);
    }
    
    const createData = await createResponse.json();
    
    console.log('🎉 柴犬创建成功！');
    console.log('宠物信息:', createData.pet);
    console.log('');
    console.log('📝 下一步：');
    console.log('1. 刷新页面查看你的柴犬');
    console.log('2. 点击右上角的宠物头像展开面板');
    console.log('3. 尝试喂食你的柴犬');
    
    // 4. 刷新页面
    setTimeout(() => {
      console.log('🔄 3秒后自动刷新页面...');
      setTimeout(() => {
        location.reload();
      }, 3000);
    }, 1000);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('详细信息:', error);
  }
}

// 导出函数供控制台使用
window.createDefaultPet = createDefaultPet;

console.log('');
console.log('🐕 柴犬创建脚本已加载');
console.log('📝 使用方法：在控制台输入 createDefaultPet() 并回车');
console.log('');
