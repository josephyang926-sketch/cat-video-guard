/* ===================================
   主应用控制器
   =================================== */

class CatVideoGuardApp {
  constructor() {
    // 核心模块
    this.player = null;
    this.guard = null;
    
    // 状态
    this.isInitialized = false;
    this.currentURL = '';
    
    // DOM元素
    this.urlInputView = null;
    this.videoURLInput = null;
    this.startBtn = null;
    
    // 初始化应用
    this.init();
  }

  /**
   * 初始化应用
   */
  async init() {
    console.log('🐱 Cat Video Guard App initializing...');
    
    try {
      // 等待DOM加载完成
      if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
      }
      
      // 获取DOM元素
      this.cacheDOMElements();
      
      // 初始化播放器
      this.initPlayer();
      
      // 初始化防误触保护层
      this.initGuard();
      
      // 绑定UI事件
      this.bindUIEvents();
      
      // 加载保存的配置
      this.loadSavedConfig();
      
      // 处理启动参数（从快捷指令传入的URL）
      await this.handleLaunchParams();
      
      // 标记初始化完成
      this.isInitialized = true;
      
      console.log('✅ Cat Video Guard App ready!');
      
      // 显示欢迎信息（首次使用）
      if (!Utils.storage.get('has_launched_before')) {
        this.showWelcome();
        Utils.storage.set('has_launched_before', true);
      }
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      this.showError('应用初始化失败，请刷新页面重试');
    }
  }

  /**
   * 缓存DOM元素引用
   */
  cacheDOMElements() {
    this.urlInputView = document.getElementById('url-input-view');
    this.videoURLInput = document.getElementById('video-url');
    this.startBtn = document.getElementById('start-btn');
    this.settingsPanel = document.getElementById('settings-panel');
  }

  /**
   * 初始化视频播放器
   */
  initPlayer() {
    this.player = new VideoPlayer();
    console.log('Player initialized');
  }

  /**
   * 初始化防误触保护层
   */
  initGuard() {
    const savedConfig = Utils.storage.get('guard_config', {});
    
    this.guard = new GuardOverlay({
      blockBottomBar: savedConfig.blockBottomBar !== undefined ? savedConfig.blockBottomBar : true,
      blockSides: savedConfig.blockSides !== undefined ? savedConfig.blockSides : true,
      catDetection: savedConfig.catDetection || false,
      autoLockTime: savedConfig.autoLockTime || 30,
      
      onUnlock: () => this.onScreenUnlock(),
      onLock: () => this.onScreenLock(),
      onCatDetected: () => this.onCatDetected()
    });
    
    console.log('Guard initialized');
  }

  /**
   * 绑定UI事件
   */
  bindUIEvents() {
    // 开始按钮
    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => this.handleStart());
    }
    
    // URL输入框回车
    if (this.videoURLInput) {
      this.videoURLInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleStart();
        }
      });
    }
    
    // 设置面板相关按钮
    this.bindSettingsEvents();
    
    // 防止意外退出页面
    window.addEventListener('beforeunload', (e) => {
      if (this.guard && this.guard.isScreenLocked()) {
        e.preventDefault();
        e.returnValue = '视频正在受保护模式中运行，确定要离开吗？';
        return e.returnValue;
      }
    });
    
    // 处理屏幕旋转
    window.addEventListener('resize', () => this.handleResize());
    
    // 阻止默认的右键菜单和选择
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    console.log('UI events bound');
  }

  /**
   * 绑定设置面板事件
   */
  bindSettingsEvents() {
    // 锁定按钮
    const lockNowBtn = document.getElementById('lock-now-btn');
    if (lockNowBtn) {
      lockNowBtn.addEventListener('click', () => {
        this.closeSettings();
        this.guard.lock();
      });
    }
    
    // 关闭设置按钮
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    }
    
    // 修改PIN按钮
    const changePinBtn = document.getElementById('change-pin-btn');
    if (changePinBtn) {
      changePinBtn.addEventListener('click', () => this.handleChangePIN());
    }
    
    // 配置开关
    const toggleBottomBar = document.getElementById('toggle-bottom-bar');
    if (toggleBottomBar) {
      toggleBottomBar.addEventListener('change', (e) => {
        this.guard.updateConfig({ blockBottomBar: e.target.checked });
      });
    }
    
    const toggleSides = document.getElementById('toggle-sides');
    if (toggleSides) {
      toggleSides.addEventListener('change', (e) => {
        this.guard.updateConfig({ blockSides: e.target.checked });
      });
    }
    
    const toggleCatDetect = document.getElementById('toggle-cat-detect');
    if (toggleCatDetect) {
      toggleCatDetect.addEventListener('change', (e) => {
        this.guard.updateConfig({ catDetection: e.target.checked });
      });
    }
    
    const autoLockTime = document.getElementById('auto-lock-time');
    if (autoLockTime) {
      autoLockTime.addEventListener('change', (e) => {
        const value = parseInt(e.target.value) || 30;
        this.guard.updateConfig({ autoLockTime: value });
      });
    }
  }

  /**
   * 处理启动参数（URL）
   */
  async handleLaunchParams() {
    // 从URL参数获取视频地址
    const urlParam = Utils.getURLParam('url');
    
    if (urlParam) {
      console.log('Launch URL param:', urlParam);
      await this.startWithURL(urlParam);
    } else {
      // 没有URL参数，显示输入界面
      this.showInputView();
    }
  }

  /**
   * 显示URL输入界面
   */
  showInputView() {
    if (this.urlInputView) {
      Utils.show(this.urlInputView);
    }
  }

  /**
   * 隐藏URL输入界面
   */
  hideInputView() {
    if (this.urlInputView) {
      Utils.hide(this.urlInputView);
    }
  }

  /**
   * 处理开始按钮点击
   */
  async handleStart() {
    let url = '';
    
    // 从输入框获取URL
    if (this.videoURLInput) {
      url = this.videoURLInput.value.trim();
    }
    
    // 如果没有输入，尝试从剪贴板读取
    if (!url) {
      try {
        // 注意：需要用户授权才能访问剪贴板
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText && Utils.isValidURL(clipboardText)) {
          url = clipboardText;
          if (this.videoURLInput) {
            this.videoURLInput.value = url;
          }
        }
      } catch (e) {
        console.log('Clipboard access denied or not available');
      }
    }
    
    if (!url) {
      Utils.showToast('请输入或粘贴有效的视频链接', 2000);
      return;
    }
    
    await this.startWithURL(url);
  }

  /**
   * 使用指定URL启动
   */
  async startWithURL(url) {
    try {
      // 规范化URL
      url = Utils.normalizeURL(url);
      this.currentURL = url;
      
      // 隐藏输入界面
      this.hideInputView();
      
      // 显示加载状态
      // this.showLoading(true);  // player会处理
      
      // 加载视频页面
      const success = await this.player.loadURL(url);
      
      if (success) {
        // 加载成功，启用防误触保护
        setTimeout(() => {
          this.guard.lock();
          
          // 尝试进入全屏（可选）
          // Utils.requestFullscreen(document.documentElement);
          
          // 尝试锁定横屏（可选）
          // Utils.lockOrientation('landscape');
          
          Utils.showToast('🔒 防误触模式已启动', 1500);
        }, 500);
      }
      
    } catch (error) {
      console.error('Failed to start:', error);
      this.showError('无法加载视频: ' + error.message);
      this.showInputView();
    }
  }

  /**
   * 屏幕解锁回调
   */
  onScreenUnlock() {
    console.log('📱 Screen unlocked - user can interact freely');
    
    // 可以在这里添加解锁后的操作
    // 例如：显示设置按钮、控制栏等
    
    // 延迟显示设置入口（可选）
    // setTimeout(() => {
    //   this.showSettingsHint();
    // }, 1000);
  }

  /**
   * 屏幕锁定回调
   */
  onScreenLock() {
    console.log('🔒 Screen locked - all touches blocked');
  }

  /**
   * 检测到猫爪行为回调
   */
  onCatDetected() {
    console.log('😼 Cat behavior detected!');
    // 可以在这里记录数据、发送通知等
  }

  /**
   * 打开设置面板
   */
  openSettings() {
    if (this.settingsPanel) {
      // 更新设置面板中的值以反映当前配置
      this.syncSettingsPanel();
      Utils.show(this.settingsPanel);
    }
  }

  /**
   * 关闭设置面板
   */
  closeSettings() {
    if (this.settingsPanel) {
      Utils.hide(this.settingsPanel);
    }
  }

  /**
   * 同步设置面板状态
   */
  syncSettingsPanel() {
    const config = this.guard.getConfig();
    
    const toggleBottomBar = document.getElementById('toggle-bottom-bar');
    if (toggleBottomBar) toggleBottomBar.checked = config.blockBottomBar;
    
    const toggleSides = document.getElementById('toggle-sides');
    if (toggleSides) toggleSides.checked = config.blockSides;
    
    const toggleCatDetect = document.getElementById('toggle-cat-detect');
    if (toggleCatDetect) toggleCatDetect.checked = config.catDetection;
    
    const autoLockTime = document.getElementById('auto-lock-time');
    if (autoLockTime) autoLockTime.value = config.autoLockTime;
  }

  /**
   * 处理修改PIN码
   */
  handleChangePIN() {
    const newPIN = prompt('请输入新的4-8位数字密码:');
    
    if (newPIN !== null) {
      if (this.guard.pinUnlock.changePIN(newPIN)) {
        Utils.showToast('✅ 密码已更新', 2000);
      } else {
        Utils.showToast('❌ 密码格式不正确（需要4-8位数字）', 2000);
      }
    }
  }

  /**
   * 显示欢迎信息
   */
  showWelcome() {
    const message = `
🐱 欢迎使用喵视频守护者！

使用方法：
1. 复制任意视频链接
2. 通过快捷指令启动 或 在此粘贴链接
3. 享受猫咪安心看视频！

解锁方式：
• 第一步：依次点击屏幕四角
• 第二步：输入4位PIN密码
• 默认密码：2024

祝您的猫咪观影愉快！ 😸
    `;
    
    alert(message.trim());
  }

  /**
   * 处理窗口大小变化（屏幕旋转等）
   */
  handleResize() {
    // 可以在这里调整布局
    console.log('Window resized:', window.innerWidth, 'x', window.innerHeight);
  }

  /**
   * 显示错误信息
   */
  showError(message) {
    Utils.showToast(message || '发生错误', 3000);
    console.error('Error:', message);
  }

  /**
   * 手动重新锁定
   */
  manualLock() {
    if (this.guard) {
      this.guard.lock();
    }
  }

  /**
   * 手动解锁
   */
  manualUnlock() {
    if (this.guard) {
      this.guard.unlock();
    }
  }

  /**
   * 获取当前状态信息
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      currentURL: this.currentURL,
      isLocked: this.guard ? this.guard.isScreenLocked() : false,
      config: this.guard ? this.guard.getConfig() : null
    };
  }

  /**
   * 销毁应用
   */
  destroy() {
    if (this.guard) this.guard.destroy();
    if (this.player) this.player.destroy();
    
    this.isInitialized = false;
    console.log('App destroyed');
  }
}

// ===================================
// 应用启动入口
// ===================================

let app;

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  app = new CatVideoGuardApp();
  
  // 导出到全局以便调试
  window.app = app;
});

// 如果DOM已经加载完成，立即初始化
if (document.readyState !== 'loading') {
  app = new CatVideoGuardApp();
  window.app = app;
}
