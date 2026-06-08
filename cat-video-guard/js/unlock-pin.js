/* ===================================
   PIN密码解锁模块 (第二层)
   =================================== */

class PINUnlock {
  constructor(options = {}) {
    // 配置
    this.length = options.length || 4;  // PIN码长度
    this.maxAttempts = options.maxAttempts || 5;  // 最大尝试次数
    this.lockoutTime = options.lockoutTime || 30000;  // 锁定时间（毫秒）
    
    // 状态
    this.currentInput = [];
    this.correctPIN = '';
    this.attempts = 0;
    this.isLocked = false;
    this.isActive = false;
    
    // 回调
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.onChangePIN = options.onChangePIN || (() => {});
    
    // DOM元素
    this.pinView = null;
    this.pinDots = [];
    this.keypad = null;
    
    this.init();
  }

  init() {
    this.pinView = document.getElementById('pin-unlock-view');
    
    if (!this.pinView) {
      console.error('PIN unlock view not found');
      return;
    }
    
    // 获取PIN显示点
    this.pinDots = Array.from(this.pinView.querySelectorAll('.pin-dot'));
    
    // 获取键盘
    this.keypad = this.pinView.querySelector('.pin-keypad');
    
    // 加载保存的PIN（如果有）
    this.loadSavedPIN();
    
    // 绑定事件
    this.bindEvents();
    
    console.log('PIN unlock initialized, length:', this.length);
  }

  /**
   * 加载保存的PIN码
   */
  loadSavedPIN() {
    const savedPIN = Utils.storage.get('user_pin', '');
    if (savedPIN) {
      this.correctPIN = savedPIN;
      console.log('Loaded saved PIN');
    } else {
      // 首次使用，设置默认PIN
      this.setDefaultPIN();
    }
  }

  /**
   * 设置默认PIN码
   */
  setDefaultPIN(pin = '2024') {
    this.correctPIN = pin;
    Utils.storage.set('user_pin', pin);
    console.log('Default PIN set:', pin);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 键盘按键点击
    if (this.keypad) {
      this.keypad.addEventListener('click', (e) => {
        const key = e.target.closest('.key');
        if (key) {
          const keyValue = key.dataset.key;
          if (keyValue) {
            this.handleKeyPress(keyValue);
          }
        }
      });
    }
    
    // 取消按钮
    const cancelBtn = document.getElementById('pin-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancel());
    }
    
    // 忘记密码按钮
    const forgotBtn = document.getElementById('pin-forgot');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', () => this.handleForgotPassword());
    }
    
    console.log('PIN events bound');
  }

  /**
   * 处理按键输入
   */
  handleKeyPress(key) {
    if (!this.isActive || this.isLocked) return;
    
    switch(key) {
      case 'delete':
        this.deleteLast();
        break;
      default:
        // 数字键
        if (/^\d$/.test(key)) {
          this.inputDigit(key);
        }
        break;
    }
  }

  /**
   * 输入数字
   */
  inputDigit(digit) {
    if (this.currentInput.length >= this.length) return;
    
    // 添加到当前输入
    this.currentInput.push(digit);
    
    // 更新UI
    this.updateDisplay();
    
    // 触觉反馈
    Utils.vibrate(5);
    
    // 检查是否输入完成
    if (this.currentInput.length === this.length) {
      // 短暂延迟后验证，让用户看到最后一个点
      setTimeout(() => this.verify(), 200);
    }
  }

  /**
   * 删除最后一位
   */
  deleteLast() {
    if (this.currentInput.length > 0) {
      this.currentInput.pop();
      this.updateDisplay();
      Utils.vibrate(5);
    }
  }

  /**
   * 更新显示
   */
  updateDisplay() {
    this.pinDots.forEach((dot, index) => {
      dot.classList.remove('filled', 'error');
      
      if (index < this.currentInput.length) {
        dot.classList.add('filled');
      }
    });
  }

  /**
   * 验证PIN码
   */
  verify() {
    const input = this.currentInput.join('');
    
    if (input === this.correctPIN) {
      // 正确！
      this.success();
    } else {
      // 错误
      this.error();
    }
  }

  /**
   * 验证成功
   */
  success() {
    // 重置尝试次数
    this.attempts = 0;
    
    // 触觉反馈
    Utils.vibrate([50, 30, 50]);
    
    // 显示成功动画
    this.showSuccessAnimation();
    
    console.log('✅ PIN correct!');
    
    // 延迟调用回调
    setTimeout(() => {
      this.onSuccess(true);
    }, 500);
  }

  /**
   * 验证错误
   */
  error() {
    this.attempts++;
    
    // 震动反馈
    Utils.vibrate([20, 20, 20]);
    
    // 显示错误动画
    this.showErrorAnimation();
    
    console.log(`❌ PIN wrong! Attempt ${this.attempts}/${this.maxAttempts}`);
    
    // 检查是否超过最大尝试次数
    if (this.attempts >= this.maxAttempts) {
      this.lockout();
    } else {
      // 清空输入，让用户重试
      setTimeout(() => {
        this.clearInput();
      }, 500);
    }
    
    // 通知错误回调
    this.onError(this.attempts, this.maxAttempts);
  }

  /**
   * 锁定（超过最大尝试次数）
   */
  lockout() {
    this.isLocked = true;
    
    const remainingSeconds = Math.ceil(this.lockoutTime / 1000);
    
    // 显示锁定提示
    Utils.showToast(`尝试次数过多，请等待 ${Utils.formatTime(remainingSeconds)}`, this.lockoutTime);
    
    // 倒计时
    let countdown = this.lockoutTime / 1000;
    const timer = setInterval(() => {
      countdown--;
      
      if (countdown <= 0) {
        clearInterval(timer);
        this.unlock();
      }
    }, 1000);
    
    console.log('PIN locked for', this.lockoutTime, 'ms');
  }

  /**
   * 解除锁定
   */
  unlock() {
    this.isLocked = false;
    this.attempts = 0;
    this.clearInput();
    console.log('PIN unlocked');
  }

  /**
   * 显示成功动画
   */
  showSuccessAnimation() {
    this.pinDots.forEach(dot => {
      dot.style.background = 'var(--success-color)';
      dot.style.borderColor = 'var(--success-color)';
    });
  }

  /**
   * 显示错误动画
   */
  showErrorAnimation() {
    this.pinDots.forEach(dot => {
      dot.classList.add('error');
    });
  }

  /**
   * 清空输入
   */
  clearInput() {
    this.currentInput = [];
    this.updateDisplay();
    
    // 重置点样式
    this.pinDots.forEach(dot => {
      dot.classList.remove('filled', 'error');
      dot.style.background = '';
      dot.style.borderColor = '';
    });
  }

  /**
   * 取消输入
   */
  cancel() {
    this.clearInput();
    this.deactivate();
    this.onCancel();
  }

  /**
   * 忘记密码处理
   */
  handleForgotPassword() {
    // 可以在这里添加重置逻辑
    // 例如：显示提示信息或重置为默认密码
    
    const confirmReset = confirm('确定要重置密码吗？\n将恢复默认密码: 2024');
    
    if (confirmReset) {
      this.setDefaultPIN();
      Utils.showToast('密码已重置为: 2024', 3000);
      this.clearInput();
    }
  }

  /**
   * 激活PIN输入界面
   */
  activate() {
    this.isActive = true;
    this.isLocked = false;
    this.clearInput();
    
    Utils.show(this.pinView);
    
    console.log('PIN input activated');
  }

  /**
   * 停用PIN输入界面
   */
  deactivate() {
    this.isActive = false;
    Utils.hide(this.pinView);
    this.clearInput();
  }

  /**
   * 修改PIN码
   */
  changePIN(newPIN) {
    if (!newPIN || !/^\d+$/.test(newPIN) || newPIN.length < 4 || newPIN.length > 8) {
      console.error('Invalid PIN format');
      return false;
    }
    
    this.correctPIN = newPIN;
    Utils.storage.set('user_pin', newPIN);
    
    console.log('PIN changed to:', newPIN);
    this.onChangePIN(newPIN);
    
    return true;
  }

  /**
   * 获取当前PIN（用于显示设置界面等）
   */
  getCurrentPIN() {
    return this.correctPIN;
  }

  /**
   * 设置PIN（用于初始化）
   */
  setPIN(pin) {
    if (pin && /^\d+$/.test(pin)) {
      this.correctPIN = pin;
      Utils.storage.set('user_pin', pin);
      return true;
    }
    return false;
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
    if (this.keypad) {
      this.keypad.removeEventListener('click', this.handleKeyPress);
    }
  }
}

// 导出到全局
window.PINUnlock = PINUnlock;
