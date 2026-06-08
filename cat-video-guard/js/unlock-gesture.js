/* ===================================
   手势解锁模块 (第一层)
   四角顺序点击解锁
   =================================== */

class GestureUnlock {
  constructor(options = {}) {
    // 配置
    this.requiredSequence = options.sequence || ['tl', 'tr', 'br', 'bl'];  // 默认四角顺序
    this.timeout = options.timeout || 3000;  // 3秒超时
    this.threshold = options.threshold || 0.12;  // 角落检测阈值（屏幕比例）
    
    // 状态
    this.currentPattern = [];
    this.lastTapTime = 0;
    this.isActive = false;
    this.isCompleted = false;
    
    // 回调
    this.onComplete = options.onComplete || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.onReset = options.onReset || (() => {});
    this.onError = options.onError || (() => {});
    
    // DOM元素
    this.unlockArea = null;
    this.corners = {};
    this.progressDots = null;
    
    this.init();
  }

  init() {
    this.unlockArea = document.getElementById('gesture-unlock-area');
    
    if (!this.unlockArea) {
      console.error('Gesture unlock area not found');
      return;
    }
    
    // 获取四个角落元素
    this.corners = {
      tl: this.unlockArea.querySelector('.corner-tl'),
      tr: this.unlockArea.querySelector('.corner-tr'),
      br: this.unlockArea.querySelector('.corner-br'),
      bl: this.unlockArea.querySelector('.corner-bl')
    };
    
    // 获取进度点
    this.progressDots = this.unlockArea.querySelectorAll('.progress-dots .dot');
    
    // 绑定触摸事件
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 使用事件委托，监听整个解锁区域的点击
    this.unlockArea.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });
    this.unlockArea.addEventListener('click', (e) => this.handleClick(e));
    
    // 防止默认行为
    this.unlockArea.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    
    console.log('Gesture unlock initialized');
  }

  /**
   * 处理触摸开始
   */
  handleTouch(e) {
    if (!this.isActive) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = Utils.getTouchPosition(e);
    this.processTap(touch.x, touch.y);
  }

  /**
   * 处理点击
   */
  handleClick(e) {
    if (!this.isActive) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    this.processTap(e.clientX, e.clientY);
  }

  /**
   * 处理点击/触摸位置
   */
  processTap(x, y) {
    const now = Date.now();
    
    // 检查是否超时（需要重新开始）
    if (now - this.lastTapTime > this.timeout && this.currentPattern.length > 0) {
      this.reset();
      this.onReset();
    }
    
    this.lastTapTime = now;
    
    // 检测点击了哪个角落
    const corner = this.detectCorner(x, y);
    
    if (corner) {
      this.addToPattern(corner);
    } else {
      // 点击了非角落区域，可以提供触觉反馈
      Utils.vibrate(5);
    }
  }

  /**
   * 检测点击位置属于哪个角落
   */
  detectCorner(x, y) {
    for (const [key] of Object.entries(this.corners)) {
      if (Utils.isInCorner(x, y, key, this.threshold)) {
        return key;
      }
    }
    return null;
  }

  /**
   * 添加到当前模式
   */
  addToPattern(corner) {
    // 检查是否是正确的下一步
    const expectedNext = this.requiredSequence[this.currentPattern.length];
    
    if (corner !== expectedNext) {
      // 错误的角落，重置
      this.handleError();
      return;
    }
    
    // 正确！添加到模式
    this.currentPattern.push(corner);
    
    // 更新UI
    this.updateCornerUI(corner, 'active');
    this.updateProgressUI();
    
    // 触觉反馈
    Utils.vibrate(10);
    
    // 通知进度
    this.onProgress(this.currentPattern.length, this.requiredSequence.length);
    
    // 检查是否完成
    if (this.currentPattern.length === this.requiredSequence.length) {
      this.complete();
    }
  }

  /**
   * 更新角落UI状态
   */
  updateCornerUI(corner, state) {
    const cornerEl = this.corners[corner];
    if (!cornerEl) return;
    
    switch(state) {
      case 'active':
        cornerEl.classList.add('active');
        break;
      case 'completed':
        cornerEl.classList.remove('active');
        cornerEl.classList.add('completed');
        break;
      default:
        cornerEl.classList.remove('active', 'completed');
    }
  }

  /**
   * 更新进度指示器
   */
  updateProgressUI() {
    if (!this.progressDots) return;
    
    this.progressDots.forEach((dot, index) => {
      dot.classList.remove('active', 'completed');
      
      if (index < this.currentPattern.length) {
        dot.classList.add('completed');
      } else if (index === this.currentPattern.length) {
        dot.classList.add('active');
      }
    });
  }

  /**
   * 完成手势解锁
   */
  complete() {
    this.isCompleted = true;
    this.isActive = false;
    
    // 标记所有角落为完成状态
    this.currentPattern.forEach(corner => {
      this.updateCornerUI(corner, 'completed');
    });
    
    // 强烈震动反馈
    Utils.vibrate([50, 30, 50]);
    
    console.log('✅ Gesture unlock completed!');
    
    // 延迟调用回调（让用户看到完成动画）
    setTimeout(() => {
      this.onComplete(true);
    }, 300);
  }

  /**
   * 处理错误
   */
  handleError() {
    // 震动提示错误
    Utils.vibrate([20, 20, 20]);
    
    // 重置
    this.reset();
    
    // 通知错误回调
    this.onError('wrong_sequence');
  }

  /**
   * 重置状态
   */
  reset() {
    this.currentPattern = [];
    this.lastTapTime = 0;
    this.isCompleted = false;
    
    // 重置所有角落UI
    Object.values(this.corners).forEach(el => {
      if (el) el.classList.remove('active', 'completed');
    });
    
    // 重置进度指示器
    if (this.progressDots) {
      this.progressDots.forEach(dot => {
        dot.classList.remove('active', 'completed');
      });
    }
    
    console.log('Gesture pattern reset');
  }

  /**
   * 激活手势解锁（显示界面并开始接收输入）
   */
  activate() {
    this.isActive = true;
    this.isCompleted = false;
    this.reset();
    
    Utils.show(this.unlockArea);
    
    // 添加激活动画类
    setTimeout(() => {
      this.unlockArea.style.animation = 'fadeIn 0.3s ease';
    }, 10);
    
    console.log('Gesture unlock activated');
  }

  /**
   * 停用手势解锁（隐藏界面）
   */
  deactivate() {
    this.isActive = false;
    Utils.hide(this.unlockArea);
    this.reset();
  }

  /**
   * 设置新的序列模式
   */
  setSequence(sequence) {
    if (Array.isArray(sequence) && sequence.length >= 2) {
      this.requiredSequence = sequence;
      this.reset();
    }
  }

  /**
   * 销毁实例
   */
  destroy() {
    this.deactivate();
    this.unbindEvents();
  }

  /**
   * 解绑事件
   */
  unbindEvents() {
    if (this.unlockArea) {
      this.unlockArea.removeEventListener('touchstart', this.handleTouch);
      this.unlockArea.removeEventListener('click', this.handleClick);
    }
  }
}

// 导出到全局
window.GestureUnlock = GestureUnlock;
