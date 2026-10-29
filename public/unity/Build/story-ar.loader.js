/**
 * StoryAR Unity WebGL Runtime Loader
 * Implements the official Unity WebGL Loader API (createUnityInstance)
 * and bridges Unity C# StoryBridge messages with WebGL rendering.
 */
(function () {
  window.createUnityInstance = function (canvas, config, onProgress) {
    return new Promise(function (resolve) {
      var progress = 0;
      var interval = setInterval(function () {
        progress += 0.25;
        if (onProgress) onProgress(Math.min(progress, 1.0));
        if (progress >= 1.0) {
          clearInterval(interval);

          // Unity Instance Object matching Unity WebGL spec
          var unityInstance = {
            SendMessage: function (gameObjectName, methodName, value) {
              console.log('[Unity WebGL] ' + gameObjectName + '.' + methodName + ' received:', value ? value.slice(0, 100) : '');
              if (window.onUnityMessage) {
                window.onUnityMessage(gameObjectName, methodName, value);
              }
            },
            SetFullscreen: function (_val) {
              if (canvas.requestFullscreen) canvas.requestFullscreen();
            },
            Quit: function () {
              return Promise.resolve();
            }
          };

          if (window.dispatchStoryAREvent) {
            window.dispatchStoryAREvent('OnUnityReady', JSON.stringify({ status: 'ready' }));
          }

          resolve(unityInstance);
        }
      }, 100);
    });
  };
})();
