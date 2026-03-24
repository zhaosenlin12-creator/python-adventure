import { getApiBaseUrl } from '@/lib/config/api';
import { showErrorToast } from '@/components/ui/ErrorToast';
import { Pet, PetStyle, PetType, getPetStyleForType } from '@/types/pet';

// 动态获取API基础URL，支持局域网访问
function getApiBase(): string {
  return getApiBaseUrl();
}

/**
 * 获取我的宠物列表
 */
export interface MyPetsResult {
  pets: Pet[];
  currentPetId: number | null;
}

export async function getMyPets(token: string): Promise<MyPetsResult> {
  // 🔒 无token时直接返回空数组
  if (!token) {
    return { pets: [], currentPetId: null };
  }
  try {
    const response = await fetch(`${getApiBase()}/pets/my`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // 🔒 包含状态码以便上层检测
      const statusText = response.status === 401 ? 'Unauthorized' : response.statusText;
      throw new Error(`Failed to get pets: ${statusText}`);
    }
    
    const data = await response.json();
    
    // 后端返回宠物列表（推荐）或单个宠物（兼容）
    if (data.success && Array.isArray(data.pets)) {
      return {
        pets: data.pets,
        currentPetId: typeof data.current_pet_id === 'number' ? data.current_pet_id : null
      };
    }
    if (data.success && data.pet) {
      return {
        pets: [data.pet],
        currentPetId: typeof data.pet?.id === 'number' ? data.pet.id : null
      };
    }
    
    return { pets: [], currentPetId: null };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw new Error('网络连接失败，请检查后端服务是否运行');
    }
    throw error;
  }
}

/**
 * 创建新宠物
 */
export async function createPet(name: string, type: PetType, token: string): Promise<Pet> {
  const petStyle = getPetStyleForType(type);
  
  const response = await fetch(`${getApiBase()}/pets/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      name, 
      pet_type: type,
      pet_style: petStyle
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to create pet: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.pet;
}

/**
 * 设置当前跟随宠物
 */
export async function setActivePet(petId: number, token: string): Promise<Pet> {
  const response = await fetch(`${getApiBase()}/pets/${petId}/set-active`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to set active pet: ${response.statusText}`);
  }

  const data = await response.json();
  return data.pet;
}

/**
 * 喂食宠物
 */
export async function feedPet(
  petId: number,
  token: string,
  options?: { effects?: Record<string, number>; foodId?: string; quantity?: number }
): Promise<Pet> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const payload: Record<string, any> = {};
    if (options?.foodId) {
      payload.food_id = options.foodId;
      payload.quantity = options.quantity ?? 1;
    }
    if (options?.effects && !options?.foodId) {
      payload.effects = options.effects;
    }
    const response = await fetch(`${getApiBase()}/pets/${petId}/feed`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to feed pet: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.pet;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试');
    }
    if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      throw new Error('网络异常，请稍后重试');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 营救宠物（从昏迷状态）
 */
export async function rescuePet(petId: number, token: string): Promise<Pet> {
  const response = await fetch(`${getApiBase()}/pets/${petId}/rescue`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to rescue pet: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.pet;
}

/**
 * 获取宠物状态
 */
export async function getPetStatus(petId: number, token: string): Promise<Pet> {
  const response = await fetch(`${getApiBase()}/pets/${petId}/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get pet status: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.pet;
}

/**
 * 更新宠物属性
 */
export async function updatePetAttributes(
  petId: number,
  attributes: { attack?: number; defense?: number; speed?: number },
  token: string
): Promise<Pet> {
  const response = await fetch(`${getApiBase()}/pets/${petId}/attributes`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(attributes)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update pet attributes: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.pet;
}

/**
 * 更新宠物名字
 */
export async function updatePetName(petId: number, name: string, token: string): Promise<Pet> {
  const response = await fetch(`${getApiBase()}/pets/${petId}/name`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update pet name: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.pet;
}

/**
 * 进化宠物
 */
export async function evolvePet(petId: number, token: string): Promise<Pet> {
  try {
    const response = await fetch(`${getApiBase()}/pets/${petId}/evolve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to evolve pet: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data?.new_achievements && data.new_achievements.length > 0) {
      data.new_achievements.forEach((a: any) => {
        showErrorToast(`🏆 成就解锁：${a.title}，快去领取奖励！`, 'info');
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('achievement-refresh'));
      }
    }
    return data.pet;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('网络连接失败，请检查网络后重试');
    }
    throw error;
  }
}

/**
 * 孵化宠物
 */
export async function hatchPet(
  petId: number,
  petType: PetType,
  petStyle: PetStyle,
  name: string,
  token: string
): Promise<Pet> {
  const response = await fetch(`${getApiBase()}/pets/${petId}/hatch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      petType: petType,
      petStyle: petStyle,
      name
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to hatch pet: ${response.statusText}`);
  }
  
  const data = await response.json();
  if (data?.new_achievements && data.new_achievements.length > 0) {
    data.new_achievements.forEach((a: any) => {
      showErrorToast(`🏆 成就解锁：${a.title}，快去领取奖励！`, 'info');
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('achievement-refresh'));
    }
  }
  return data.pet;
}

/**
 * 更新孵化进度
 */
export async function updateHatchProgress(petId: number, token: string): Promise<Pet> {
  const response = await fetch(`${getApiBase()}/pets/${petId}/hatch-progress`, {
    method: 'POST',  // 后端使用 POST 方法
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update hatch progress: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.pet;
}
