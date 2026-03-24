/**
 * 触控输入管理器
 * 管理虚拟控制器的输入状态，供Phaser场景使用
 */

export interface TouchInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
  interact: boolean;  // E键 - 交互
  dash: boolean;      // 空格键 - 冲刺
  timestamp: number;
}

class TouchInputManager {
  private state: TouchInputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    attack: false,
    interact: false,
    dash: false,
    timestamp: 0,
  };

  private listeners: Set<(state: TouchInputState) => void> = new Set();

  /**
   * 获取当前输入状态
   */
  getState(): TouchInputState {
    return { ...this.state };
  }

  /**
   * 设置方向键状态
   */
  setDirection(direction: 'left' | 'right' | 'up' | 'down', pressed: boolean): void {
    if (this.state[direction] !== pressed) {
      this.state[direction] = pressed;
      this.state.timestamp = Date.now();
      this.notifyListeners();
    }
  }

  /**
   * 设置动作按钮状态
   */
  setAction(action: 'jump' | 'attack' | 'interact' | 'dash', pressed: boolean): void {
    if (this.state[action] !== pressed) {
      this.state[action] = pressed;
      this.state.timestamp = Date.now();
      this.notifyListeners();
    }
  }

  /**
   * 重置所有输入状态
   */
  reset(): void {
    this.state = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      attack: false,
      interact: false,
      dash: false,
      timestamp: Date.now(),
    };
    this.notifyListeners();
  }

  /**
   * 添加状态变化监听器
   */
  addListener(callback: (state: TouchInputState) => void): void {
    this.listeners.add(callback);
  }

  /**
   * 移除状态变化监听器
   */
  removeListener(callback: (state: TouchInputState) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (e) {
        console.error('TouchInputManager listener error:', e);
      }
    });
  }

  /**
   * 检查是否有任何方向键被按下
   */
  hasDirectionInput(): boolean {
    return this.state.left || this.state.right || this.state.up || this.state.down;
  }

  /**
   * 检查是否有任何动作键被按下
   */
  hasActionInput(): boolean {
    return this.state.jump || this.state.attack;
  }

  /**
   * 检查是否有任何输入
   */
  hasAnyInput(): boolean {
    return this.hasDirectionInput() || this.hasActionInput();
  }

  /**
   * 获取水平方向输入值 (-1, 0, 1)
   */
  getHorizontalAxis(): number {
    if (this.state.left && !this.state.right) return -1;
    if (this.state.right && !this.state.left) return 1;
    return 0;
  }

  /**
   * 获取垂直方向输入值 (-1, 0, 1)
   */
  getVerticalAxis(): number {
    if (this.state.up && !this.state.down) return -1;
    if (this.state.down && !this.state.up) return 1;
    return 0;
  }
}

// 导出单例实例
export const touchInputManager = new TouchInputManager();

// 也导出类以便测试
export { TouchInputManager };

export default touchInputManager;
