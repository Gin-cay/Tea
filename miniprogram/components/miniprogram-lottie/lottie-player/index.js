'use strict';

// 组件内部依赖：lottie-lib.js（为避免在组件间 require 父级大库导致打包器漏加载，这里复制到同目录）
var _index = require('./lottie-lib.js');
var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * 小程序自定义组件：lottie-player
 * - 支持 props: width/height/path/animationData/loop/autoplay
 * - 当 path / animationData 变化时自动重新加载动画
 */
Component({
  properties: {
    width: {
      type: Number,
      value: 100
    },
    height: {
      type: Number,
      value: 100
    },
    path: {
      type: String,
      observer: function observer() {
        this.init();
      }
    },
    animationData: {
      type: Object,
      observer: function observer() {
        this.init();
      }
    },
    loop: {
      type: Boolean,
      value: true
    },
    autoplay: {
      type: Boolean,
      value: true
    }
  },

  ready: function ready() {
    this.init();
  },

  methods: {
    init: function init(animationData) {
      var width = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.properties.width;
      var height = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.properties.height;

      var data = animationData || this.properties.animationData;
      var dataPath = this.properties.path;
      if (!data && !dataPath) {
        return;
      }

      this.destory();

      // 固定 canvas-id 为 'lottie-canvas'，与 index.wxml 保持一致
      var canvasContext = _index.api.createCanvasContext('lottie-canvas', this);
      canvasContext.canvas = {
        width: width,
        height: height
      };

      this.lottie = _index2.default.loadAnimation({
        renderer: 'canvas', // 只支持 canvas 渲染
        loop: this.data.loop,
        autoplay: this.data.autoplay,
        animationData: data,
        path: dataPath,
        rendererSettings: {
          context: canvasContext,
          clearCanvas: true
        }
      });
    },

    destory: function destory() {
      if (this.lottie) {
        this.lottie.destroy();
        this.lottie = null;
      }
    }
  },

  detached: function detached() {
    this.destory();
  }
});

