/* ===================================
   工具函数模块
   =================================== */

const Utils = {
  /**
   * 获取URL参数
   */
  getURLParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  },

  /**
   * 验证是否为有效URL
   */
  isValidURL(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      // 尝试添加协议
      try {
        new URL('https://' + string);
        return true;
      } catch (_) {
        return false;
      }
    }
  },

  /**
   * 规范化URL（确保有协议）
   */
  normalizeURL(url) {
    if (!url) return '';
    
    // 如果没有协议，添加https://
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }
    
    return url;
  },

  /**
   * 防抖函数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * 节流函数
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * 显示元素
   */
  show(element) {
    if (element) element.classList.remove('hidden');
  },

  /**
   * 隐藏元素
   */
  hide(element) {
    if (element) element.classList.add('hidden');
  },

  /**
   * 切换元素显示状态
   */
  toggle(element) {
    if (element) element.classList.toggle('hidden');
  },

  /**
   * 延迟执行
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * 获取触摸位置（兼容鼠标和触摸）
   */
  getTouchPosition(e) {
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      return {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY
      };
    } else {
      return {
        x: e.clientX,
        y: e.clientY
      };
    }
  },

  /**
   * 检测是否在安全区域（四角等）
   */
  isInCorner(x, y, corner, threshold = 0.12) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    switch(corner) {
      case 'tl':
        return x < w * threshold && y < h * threshold;
      case 'tr':
        return x > w * (1 - threshold) && y < h * threshold;
      case 'br':
        return x > w * (1 - threshold) && y > h * (1 - threshold);
      case 'bl':
        return x < w * threshold && y > h * (1 - threshold);
      default:
        return false;
    }
  },

  /**
   * LocalStorage 封装
   */
  storage: {
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(`cvg_${key}`);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    },
    
    set(key, value) {
      try {
        localStorage.setItem(`cvg_${key}`, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error('Storage error:', e);
        return false;
      }
    },
    
    remove(key) {
      localStorage.removeItem(`cvg_${key}`);
    },

    clear() {
      Object.keys(localStorage)
        .filter(key => key.startsWith('cvg_'))
        .forEach(key => localStorage.removeItem(key));
    }
  },

  /**
   * 震动反馈（如果设备支持）
   */
  vibrate(pattern = 10) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },

  /**
   * 播放音效（可选）
   */
  playSound(type = 'tap') {
    // 可以在这里添加音效逻辑
    // 目前使用震动代替
    this.vibrate(5);
  },

  /**
   * 显示临时提示
   */
  showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'temp-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      z-index: 99999;
      font-size: 16px;
      animation: fadeIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * 格式化时间
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * 生成随机ID
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  },

  /**
   * 深拷贝对象
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * 检测是否为移动设备/iPad
   */
  isMobileDevice() {
    return /iPad|iPhone|iPod|Android/.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  },

  /**
   * 获取屏幕方向
   */
  getOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  },

  /**
   * 锁定屏幕方向（如果支持）
   */
  async lockOrientation(orientation) {
    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock(orientation);
        return true;
      }
    } catch (e) {
      console.log('Screen orientation lock not supported');
    }
    return false;
  },

  /**
   * 进入全屏模式
   */
  async requestFullscreen(element = document.documentElement) {
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
      return true;
    } catch (e) {
      console.log('Fullscreen not supported:', e);
      return false;
    }
  },

  /**
   * 退出全屏模式
   */
  async exitFullscreen() {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      }
      return true;
    } catch (e) {
      return false;
    }
  }
};

// 导出到全局
window.Utils = Utils;
