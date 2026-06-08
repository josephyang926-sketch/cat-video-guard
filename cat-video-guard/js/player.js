/* ===================================
   视频播放器 / 内嵌浏览器模块
   =================================== */

class VideoPlayer {
  constructor() {
    this.iframe = null;
    this.container = null;
    this.isLoading = false;
    this.currentURL = '';
    
    this.init();
  }

  init() {
    this.iframe = document.getElementById('video-frame');
    this.container = document.getElementById('browser-container');
    
    // 监听iframe加载事件
    if (this.iframe) {
      this.iframe.addEventListener('load', () => this.onLoad());
      this.iframe.addEventListener('error', (e) => this.onError(e));
    }
  }

  /**
   * 加载URL
   */
  async loadURL(url) {
    if (!url) {
      console.error('No URL provided');
      return false;
    }

    // 规范化URL
    url = Utils.normalizeURL(url);
    this.currentURL = url;
    
    // 显示加载状态
    this.showLoading(true);
    this.isLoading = true;
    
    try {
      // 设置iframe src
      this.iframe.src = url;
      
      // 等待加载（设置超时）
      const loadPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('加载超时'));
        }, 15000);  // 15秒超时
        
        this.iframe.onload = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        
        this.iframe.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('加载失败'));
        };
      });
      
      await loadPromise;
      return true;
      
    } catch (error) {
      console.error('Failed to load URL:', error);
      this.showError(error.message);
      return false;
    }
  }

  /**
   * iframe加载完成
   */
  onLoad() {
    console.log('Video page loaded:', this.currentURL);
    this.showLoading(false);
    this.isLoading = false;
    
    // 尝试进入全屏（可选）
    // this.requestIframeFullscreen();
  }

  /**
   * 加载错误处理
   */
  onError(error) {
    console.error('iframe error:', error);
    this.showLoading(false);
    this.isLoading = false;
    this.showError('无法加载此页面，请检查链接是否正确');
  }

  /**
   * 显示/隐藏加载状态
   */
  showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      if (show) {
        Utils.show(loadingOverlay);
      } else {
        // 延迟隐藏，让用户看到已加载
        setTimeout(() => Utils.hide(loadingOverlay), 300);
      }
    }
  }

  /**
   * 显示错误信息
   */
  showError(message) {
    Utils.showToast(message || '加载失败', 3000);
    
    // 可以选择显示输入界面让用户重新输入
    setTimeout(() => {
      const inputView = document.getElementById('url-input-view');
      if (inputView) Utils.show(inputView);
    }, 2000);
  }

  /**
   * 尝试让iframe内的视频全屏
   */
  async requestIframeFullscreen() {
    try {
      // 尝试通过postMessage与iframe通信
      // 注意：这需要目标网站支持
      setTimeout(() => {
        try {
          this.iframe.contentWindow.postMessage({
            type: 'requestFullscreen'
          }, '*');
        } catch (e) {
          // 跨域可能无法访问
          console.log('Cannot communicate with iframe (cross-origin)');
        }
      }, 1000);
    } catch (e) {
      console.log('Fullscreen request failed');
    }
  }

  /**
   * 刷新当前页面
   */
  refresh() {
    if (this.currentURL && this.iframe) {
      this.iframe.src = this.currentURL;
    }
  }

  /**
   * 返回上一页
   */
  back() {
    // iframe的history操作受限，通常不支持
    console.warn('iframe back navigation is limited');
  }

  /**
   * 获取当前URL
   */
  getCurrentURL() {
    return this.currentURL;
  }

  /**
   * 销毁实例
   */
  destroy() {
    if (this.iframe) {
      this.iframe.src = 'about:blank';
    }
    this.currentURL = '';
    this.isLoading = false;
  }
}

// 导出到全局
window.VideoPlayer = VideoPlayer;
