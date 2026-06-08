/* ===================================
   防误触保护层模块 (核心!)
   =================================== */

class GuardOverlay {
  constructor(options = {}) {
    // 配置
    this.config = {
      blockBottomBar: options.blockBottomBar !== undefined ? options.blockBottomBar : true,
      blockSides: options.blockSides !== undefined ? options.blockSides : true,
      catDetection: options.catDetection || false,
      autoLockTime: options.autoLockTime || 30,  // 自动重新锁定时间（秒）
    };
    
    // 状态
    this.isLocked = true;
    this.autoLockTimer = null;
    this.lastInteraction = Date.now();
    this.touchHistory = [];  // 用于猫爪检测
    
    // 子模块
    this.gestureUnlock = null;
    this.pinUnlock = null;
    
    // DOM元素
    this.overlay = null;
    this.blockedZones = {};
    
    // 回调
    this.onUnlock = options.onUnlock || (() => {});
    this.onLock = options.onLock || (() => {});
    this.onCatDetected = options.onCatDetected || (() => {});
    
    this.init();
  }

  init() {
    this.overlay = document.getElementById('guard-overlay');
    
    if (!this.overlay) {
      console.error('Guard overlay not found');
      return;
    }
    
    // 获取屏蔽区域
    this.blockedZones = {
      bottom: this.overlay.querySelector('.zone-bottom'),
      left: this.overlay.querySelector('.zone-left'),
      right: this.overlay.querySelector('.zone-right')
    };
    
    // 初始化子模块
    this.initSubmodules();
    
    // 绑定事件
    this.bindEvents();
    
    // 应用配置
    this.applyConfig();
    
    console.log('Guard overlay initialized');
  }

  /**
   * 初始化子模块（手势解锁 + PIN解锁）
   */
  initSubmodules() {
    // 手势解锁（第一层）
    this.gestureUnlock = new GestureUnlock({
      onComplete: (success) => {
        if (success) {
          // 手势完成，进入第二层：PIN码
          console.log('Gesture complete, showing PIN...');
          this.gestureUnlock.deactivate();
          this.pinUnlock.activate();
        }
      },
      onProgress: (current, total) => {
        // 可以在这里添加进度反馈
      },
      onError: (errorType) => {
        console.log('Gesture error:', errorType);
      }
    });
    
    // PIN解锁（第二层）
    this.pinUnlock = new PINUnlock({
      onSuccess: (success) => {
        if (success) {
          // PIN正确，完全解锁！
          this.pinUnlock.deactivate();
          this.unlock();
        }
      },
      onError: (attempts, maxAttempts) => {
        console.log('PIN error:', attempts, '/', maxAttempts);
      },
      onCancel: () => {
        // 用户取消，返回手势界面
        this.pinUnlock.deactivate();
        this.gestureUnlock.activate();
      }
    });
  }

  /**
   * 绑定触摸事件（核心拦截逻辑）
   */
  bindEvents() {
    // 在整个overlay上监听触摸，拦截所有事件
    this.overlay.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.overlay.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.overlay.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    
    // 鼠标事件（用于调试）
    this.overlay.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.overlay.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.overlay.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    
    // 阻止默认的触摸行为（滚动、缩放等）
    this.overlay.addEventListener('gesturestart', (e) => e.preventDefault());
    this.overlay.addEventListener('gesturechange', (e) => e.preventDefault());
    this.overlay.addEventListener('gestureend', (e) => e.preventDefault());
    
    console.log('Touch events bound to guard overlay');
  }

  /**
   * 处理触摸开始 - 核心拦截点
   */
  handleTouchStart(e) {
    if (!this.isLocked) return;  // 已解锁则不拦截
    
    const touch = Utils.getTouchPosition(e);
    const now = Date.now();
    
    // 记录触摸历史（用于猫爪检测）
    this.recordTouch(touch, now);
    
    // 检测是否点击了屏蔽区域
    if (this.isInBlockedZone(touch.x, touch.y)) {
      // 在屏蔽区域内，直接吞掉事件
      e.preventDefault();
      e.stopPropagation();
      this.showBlockedFeedback(touch.x, touch.y);
      return;
    }
    
    // 检测是否是猫爪行为（如果启用了检测）
    if (this.config.catDetection && this.detectCatBehavior()) {
      this.showCatDetectedToast();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // 让手势/PIN模块处理这个触摸
    // 注意：这里不阻止事件传播，让子模块可以接收
  }

  /**
   * 处理触摸移动
   */
  handleTouchMove(e) {
    if (!this.isLocked) return;
    
    // 锁定时阻止所有滑动操作
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * 处理触摸结束
   */
  handleTouchEnd(e) {
    if (!this.isLocked) return;
    
    // 可以在这里添加额外的逻辑
  }

  /**
   * 鼠标事件处理（调试用）
   */
  handleMouseDown(e) {
    if (!this.isLocked) return;
    // 类似touchstart的逻辑
  }

  handleMouseMove(e) {
    if (!this.isLocked) return;
    e.preventDefault();
  }

  handleMouseUp(e) {
    if (!this.isLocked) return;
  }

  /**
   * 检测是否在屏蔽区域
   */
  isInBlockedZone(x, y) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    // 底部手势栏
    if (this.config.blockBottomBar && this.blockedZones.bottom && !this.blockedZones.bottom.classList.contains('disabled')) {
      if (y > h - Math.max(env(safe-area-inset-bottom) || 0, 50)) {
        return true;
      }
    }
    
    // 左侧
    if (this.config.blockSides && this.blockedZones.left && !this.blockedZones.left.classList.contains('disabled')) {
      if (x < 30) return true;
    }
    
    // 右侧
    if (this.config.blockSides && this.blockedZones.right && !this.blockedZones.right.classList.contains('disabled')) {
      if (x > w - 30) return true;
    }
    
    return false;
  }

  /**
   * 显示被屏蔽的视觉反馈（可选）
   */
  showBlockedFeedback(x, y) {
    // 轻微震动反馈
    Utils.vibrate(3);
    
    // 可选：显示一个小涟漪效果表示"已屏蔽"
    // 这里保持简洁，不显示任何东西以避免干扰视频观看
  }

  /**
   * 记录触摸数据（用于猫爪检测）
   */
  recordTouch(position, timestamp) {
    this.touchHistory.push({
      x: position.x,
      y: position.y,
      time: timestamp
    });
    
    // 只保留最近50次触摸记录
    if (this.touchHistory.length > 50) {
      this.touchHistory.shift();
    }
  }

  /**
   * 猫爪行为检测算法
   */
  detectCatBehavior() {
    if (this.touchHistory.length < 5) return false;
    
    const recentTouches = this.touchHistory.slice(-10);
    const now = Date.now();
    
    // 指标1: 触摸频率过高（>10次/秒）
    const touchesPerSecond = recentTouches.filter(t => now - t.time < 1000).length;
    if (touchesPerSecond > 8) return true;
    
    // 指标2: 触摸位置随机性高（熵值大）
    if (this.calculateEntropy(recentTouches) > 0.8) return true;
    
    // 指标3: 快速大面积移动（抓挠动作）
    if (this.detectScratchingMotion(recentTouches)) return true;
    
    return false;
  }

  /**
   * 计算位置熵值（衡量随机性）
   */
  calculateEntropy(touches) {
    if (touches.length < 2) return 0;
    
    // 将屏幕分成网格，计算分布
    const gridSize = 5;
    const grid = {};
    
    touches.forEach(t => {
      const gx = Math.floor((t.x / window.innerWidth) * gridSize);
      const gy = Math.floor((t.y / window.innerHeight) * gridSize);
      const key = `${gx},${gy}`;
      grid[key] = (grid[key] || 0) + 1;
    });
    
    // 计算熵
    const total = touches.length;
    let entropy = 0;
    
    Object.values(grid).forEach(count => {
      const p = count / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    });
    
    // 归一化到0-1
    const maxEntropy = Math.log2(gridSize * gridSize);
    return entropy / maxEntropy;
  }

  /**
   * 检测抓挠动作
   */
  detectScratchingMotion(touches) {
    if (touches.length < 3) return false;
    
    let totalDistance = 0;
    
    for (let i = 1; i < touches.length; i++) {
      const dx = touches[i].x - touches[i-1].x;
      const dy = touches[i].y - touches[i-1].y;
      totalDistance += Math.sqrt(dx*dx + dy*dy);
    }
    
    const avgDistance = totalDistance / (touches.length - 1);
    const timeSpan = touches[touches.length-1].time - touches[0].time;
    
    // 短时间内移动距离大
    return avgDistance > 100 && timeSpan < 500;
  }

  /**
   * 显示猫爪检测提示
   */
  showCatDetectedToast() {
    const toast = document.getElementById('cat-detected-toast');
    if (toast) {
      Utils.show(toast);
      
      // 重置动画
      toast.style.animation = 'none';
      toast.offsetHeight;  // 触发reflow
      toast.style.animation = 'slideDown 0.3s ease, fadeOut 0.3s ease 2s forwards';
      
      // 通知回调
      this.onCatDetected();
      
      // 2.5秒后自动隐藏
      setTimeout(() => {
        Utils.hide(toast);
      }, 2500);
    }
  }

  /**
   * 🔒 锁定屏幕
   */
  lock() {
    this.isLocked = true;
    
    // 显示overlay
    this.overlay.classList.add('active');
    
    // 激活手势解锁
    this.gestureUnlock.activate();
    
    // 启动自动锁定计时器（实际上已经是锁定了，这里是重置计时器）
    this.resetAutoLockTimer();
    
    // 通知回调
    this.onLock();
    
    console.log('🔒 Screen locked');
  }

  /**
   * 🔓 解锁屏幕
   */
  unlock() {
    this.isLocked = false;
    
    // 隐藏overlay
    this.overlay.classList.remove('active');
    
    // 停用所有解锁模块
    this.gestureUnlock.deactivate();
    this.pinUnlock.deactivate();
    
    // 显示成功动画
    this.showUnlockSuccessAnimation();
    
    // 启动自动重新锁定计时器
    this.startAutoLockTimer();
    
    // 通知回调
    this.onUnlock();
    
    console.log('🔓 Screen unlocked');
  }

  /**
   * 显示解锁成功动画
   */
  showUnlockSuccessAnimation() {
    const animation = document.getElementById('unlock-success-animation');
    if (animation) {
      Utils.show(animation);
      
      // 重置动画
      animation.style.animation = 'none';
      animation.offsetHeight;
      animation.style.animation = 'successPop 0.6s ease forwards';
      
      // 动画结束后隐藏
      setTimeout(() => {
        Utils.hide(animation);
      }, 1500);
    }
  }

  /**
   * 启动自动重新锁定计时器
   */
  startAutoLockTimer() {
    this.clearAutoLockTimer();
    
    if (this.config.autoLockTime > 0) {
      this.autoLockTimer = setTimeout(() => {
        if (!this.isLocked) {
          console.log('Auto-locking due to inactivity...');
          this.lock();
        }
      }, this.config.autoLockTime * 1000);
    }
  }

  /**
   * 重置自动锁定计时器
   */
  resetAutoLockTimer() {
    this.lastInteraction = Date.now();
    this.startAutoLockTimer();
  }

  /**
   * 清除自动锁定计时器
   */
  clearAutoLockTimer() {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  /**
   * 应用配置设置
   */
  applyConfig() {
    // 屏蔽底部手势栏
    if (this.blockedZones.bottom) {
      if (this.config.blockBottomBar) {
        this.blockedZones.bottom.classList.remove('disabled');
      } else {
        this.blockedZones.bottom.classList.add('disabled');
      }
    }
    
    // 屏蔽侧边
    [this.blockedZones.left, this.blockedZones.right].forEach(zone => {
      if (zone) {
        if (this.config.blockSides) {
          zone.classList.remove('disabled');
        } else {
          zone.classList.add('disabled');
        }
      }
    });
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    this.applyConfig();
    
    // 保存配置到本地存储
    Utils.storage.set('guard_config', this.config);
    
    console.log('Guard config updated:', this.config);
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * 获取当前锁定状态
   */
  isScreenLocked() {
    return this.isLocked;
  }

  /**
   * 手动触发锁定/解锁切换
   */
  toggle() {
    if (this.isLocked) {
      this.unlock();
    } else {
      this.lock();
    }
  }

  /**
   * 销毁实例
   */
  destroy() {
    this.clearAutoLockTimer();
    this.unlock();
    
    if (this.gestureUnlock) this.gestureUnlock.destroy();
    if (this.pinUnlock) this.pinUnlock.destroy();
    
    // 解绑事件
    if (this.overlay) {
      this.overlay.removeEventListener('touchstart', this.handleTouchStart);
      this.overlay.removeEventListener('touchmove', this.handleTouchMove);
      this.overlay.removeEventListener('touchend', this.handleTouchEnd);
    }
  }
}

// 导出到全局
window.GuardOverlay = GuardOverlay;
