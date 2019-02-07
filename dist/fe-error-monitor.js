/**
 * fe-error-monitor v1.0.0
 * Copyright 2018-2019 Ranjay
 * Released under the Apache License
 * https://github.com/jerryOnlyZRJ/fe-error-monitor
 */
// Copyright 2019 ranjayzheng
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function (root, factory) {
    if (typeof module === 'undefined') {
      root.ErrorMonitor = factory()
    } else {
      module.exports = factory()
    }
  }(this, function () {
      "use strict";

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  // Copyright 2019 ranjayzheng
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //     http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.
  var ErrorMonitor =
  /*#__PURE__*/
  function () {
    function ErrorMonitor() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      _classCallCheck(this, ErrorMonitor);

      this.options = options;
      this.xhr = new XMLHttpRequest();
      this.xhr.send = XMLHttpRequest.prototype.send;
      this.xhr.open = XMLHttpRequest.prototype.open;
      this.monitorResult = {};
    }
    


    _createClass(ErrorMonitor, [{
      key: "uploadMonitorLogs",
      value: function uploadMonitorLogs() {
        if (this.options.url) {
          if (navigator.sendBeacon && typeof navigator.sendBeacon === 'function') {
            var headers = {
              type: 'application/json'
            };
            var blob = new window.Blob([JSON.stringify(this.monitorResult)], headers);
            navigator.sendBeacon(this.options.url, blob);
          } else if ('fetch' in window) {
            window.fetch(this.options.url, {
              method: 'POST',
              body: JSON.stringify(this.monitorResult)
            });
          } else if ('XMLHttpRequest' in window && typeof window.XMLHttpRequest === 'function') {
            var xhr = new window.XMLHttpRequest();
            xhr.open('POST', this.options.url);
            xhr.send(JSON.stringify(this.monitorResult));
          }
        } else {
          if (window.localStorage) {
            window.localStorage.setItem('errorLog', JSON.stringify(this.monitorResult));
          }
        }
      }
      

    }, {
      key: "addResult",
      value: function addResult(type) {
        var result = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        result.time = new Date().getTime();
        result.url = window.location.href;

        if (this.monitorResult[type]) {
          this.monitorResult[type].push(result);
        } else {
          this.monitorResult[type] = [result];
        }
      }
      

    }, {
      key: "init",
      value: function init() {
        var _this2 = this;

        
        var rewriteWindowOnerror = function rewriteWindowOnerror() {
          var oldWindowOnerror = window.onerror;

          window.onerror = function (message, src, line, column, error) {
            oldWindowOnerror && oldWindowOnerror(message, src, line, column, error);
            var onerrorMonitorResult = {
              type: 'Error',
              message: message,
              src: src,
              line: line,
              column: column,
              error: error
            };

            _this2.addResult('error', onerrorMonitorResult);

            return true;
          };
        };
        


        var resourceErrorMonitor = function resourceErrorMonitor() {
          window.addEventListener('error', function (e) {
            if (e.target === window) {
              return;
            }

            var errorObject = e.target;

            if (errorObject.src) {
              _this2.xhr.open('HEAD', errorObject.src);

              _this2.xhr.send();

              _this2.xhr.onload = function (response) {
                var resourceErrorMonitorResult = {
                  type: 'ResourceError',
                  outerHTML: errorObject.outerHTML,
                  src: errorObject.src,
                  status: response.target.status,
                  response: response.target.responseText
                };

                _this2.addResult('resourceError', resourceErrorMonitorResult);
              };
            }

            return false;
          }, true);
        };
        


        var promiseErrorMonitor = function promiseErrorMonitor() {
          window.addEventListener('unhandledrejection', function (error) {
            var unhandledrejectionError = {
              type: 'Unhandledrejection',
              message: error.reason
            };

            _this2.addResult('unhandledrejection', unhandledrejectionError);
          });
        };
        


        var ajaxErrorMonitor = function ajaxErrorMonitor() {
          fetchErrorMonitor();
          xmlHttpErrorMonitor();
        };
        


        var fetchErrorMonitor = function fetchErrorMonitor() {
          if ('fetch' in window && typeof window.fetch === 'function') {
            var originFetch = window.fetch;
            var _this = _this2;

            window.fetch = function (input, options) {
              return originFetch.apply(this, arguments).then(function (res) {
                if (!res.ok) {
                  originFetch(input, options).then(function (res) {
                    return res.text();
                  }).then(function (response) {
                    var fetchErrorResult = {
                      type: 'FetchError',
                      src: res.url,
                      status: res.status,
                      method: options && options.method || 'GET',
                      response: response
                    };

                    _this.addResult('ajax', fetchErrorResult);
                  });
                }

                return res;
              });
            };
          }
        };
        


        var xmlHttpErrorMonitor = function xmlHttpErrorMonitor() {
          var originXhrOpen = XMLHttpRequest.prototype.open;
          var originXhrSend = XMLHttpRequest.prototype.send;

          var addResult = _this2.addResult.bind(_this2);

          var XMLMethod = 'GET';

          XMLHttpRequest.prototype.open = function (method, url) {
            XMLMethod = method;
            originXhrOpen.apply(this, arguments);
          };

          XMLHttpRequest.prototype.send = function (data) {
            var _this = this;

            originXhrSend.call(_this, data);
            var oldOnReadyStateChange = _this.onreadystatechange;

            _this.onreadystatechange = function () {
              if (_this.readyState === 4 && !/20[1-9]/.test(_this.status)) {
                var xmlHttpError = {
                  type: 'XMLHttpRequestError',
                  src: _this.responseURL,
                  method: XMLMethod,
                  status: _this.status,
                  response: _this.responseText
                };
                addResult('ajax', xmlHttpError);
              }

              oldOnReadyStateChange && oldOnReadyStateChange.apply(_this, arguments);
            };
          };
        };
        


        var crossOriginScriptErrorMonitor = function crossOriginScriptErrorMonitor() {
          document.createElement = function () {
            var fn = document.createElement.bind(document);
            return function (type) {
              var result = fn(type);

              if (type === 'script') {
                result.crossOrigin = 'anonymous';
              }

              return result;
            };
          }();
        };
        


        var uploadResult = function uploadResult() {
          var oldOnload = window.onload;

          window.onload = function (e) {
            if (oldOnload && typeof oldOnload === 'function') {
              oldOnload(e);
            } // 尽量不影响页面主线程


            if (window.requestIdleCallback) {
              window.requestIdleCallback(_this2.uploadMonitorLogs.bind(_this2));
            } else {
              setTimeout(_this2.uploadMonitorLogs.bind(_this2));
            }
          };
        };

        rewriteWindowOnerror();
        resourceErrorMonitor();
        promiseErrorMonitor();
        ajaxErrorMonitor();
        uploadResult();
        crossOriginScriptErrorMonitor();
      }
    }]);

    return ErrorMonitor;
  }();

  return ErrorMonitor;
  }))
  