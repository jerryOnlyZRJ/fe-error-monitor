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

export default class ErrorMonitor {
    constructor (options = {}) {
        this.options = options
        this.xhr = new XMLHttpRequest()
        this.xhr.send = XMLHttpRequest.prototype.send
        this.xhr.open = XMLHttpRequest.prototype.open
        this.monitorResult = {}
    }
    /**
     * 上报数据
     */
    uploadMonitorLogs () {
        if (this.options.url) {
            if (navigator.sendBeacon && typeof navigator.sendBeacon === 'function') {
                const headers = {
                    type: 'application/json'
                }
                const blob = new window.Blob([JSON.stringify(this.monitorResult)], headers)
                navigator.sendBeacon(this.options.url, blob)
            } else if ('fetch' in window) {
                window.fetch(this.options.url, {
                    method: 'POST',
                    body: JSON.stringify(this.monitorResult)
                })
            } else if ('XMLHttpRequest' in window && typeof window.XMLHttpRequest === 'function') {
                const xhr = new window.XMLHttpRequest()
                xhr.open('POST', this.options.url)
                xhr.send(JSON.stringify(this.monitorResult))
            }
        } else {
            if (window.localStorage) {
                window.localStorage.setItem('errorLog', JSON.stringify(this.monitorResult))
            }
        }
    }
    /**
     * 添加捕获的错误结果
     * @param {String} type 错误类型
     * @param {Object} result 错误结果对象
     */
    addResult (type, result = {}) {
        result.time = new Date().getTime()
        result.url = window.location.href
        if (this.monitorResult[type]) {
            this.monitorResult[type].push(result)
        } else {
            this.monitorResult[type] = [result]
        }
    }
    /**
     * 初始化控件
     */
    init () {
        /**
         * 监听普通Error抛出
         */
        const rewriteWindowOnerror = () => {
            const oldWindowOnerror = window.onerror
            window.onerror = (message, src, line, column, error) => {
                oldWindowOnerror && oldWindowOnerror(message, src, line, column, error)
                const onerrorMonitorResult = {
                    type: 'Error',
                    message,
                    src,
                    line,
                    column,
                    error
                }
                this.addResult('error', onerrorMonitorResult)
                return true
            }
        }

        /**
         * 监听资源加载错误
         */
        const resourceErrorMonitor = () => {
            window.addEventListener('error', e => {
                if (e.target === window) {
                    return
                }
                const errorObject = e.target
                if (errorObject.src) {
                    this.xhr.open('HEAD', errorObject.src)
                    this.xhr.send()
                    this.xhr.onload = response => {
                        const resourceErrorMonitorResult = {
                            type: 'ResourceError',
                            outerHTML: errorObject.outerHTML,
                            src: errorObject.src,
                            status: response.target.status,
                            response: response.target.responseText
                        }
                        this.addResult('resourceError', resourceErrorMonitorResult)
                    }
                }
                return false
            }, true)
        }

        /**
         * 监听Promise Error
         */
        const promiseErrorMonitor = () => {
            window.addEventListener('unhandledrejection', error => {
                const unhandledrejectionError = {
                    type: 'Unhandledrejection',
                    message: error.reason
                }
                this.addResult('unhandledrejection', unhandledrejectionError)
            })
        }

        /**
         * 监听AJAX Error
         */
        const ajaxErrorMonitor = () => {
            fetchErrorMonitor()
            xmlHttpErrorMonitor()
        }

        /**
         * Fetch Error
         */
        const fetchErrorMonitor = () => {
            if ('fetch' in window && typeof window.fetch === 'function') {
                const originFetch = window.fetch
                const _this = this
                window.fetch = function (input, options) {
                    return originFetch.apply(this, arguments).then(res => {
                        if (!res.ok) {
                            originFetch(input, options).then(res => res.text()).then(response => {
                                const fetchErrorResult = {
                                    type: 'FetchError',
                                    src: res.url,
                                    status: res.status,
                                    method: options && options.method || 'GET',
                                    response
                                }
                                _this.addResult('ajax', fetchErrorResult)
                            })
                        }
                        return res
                    })
                }
            }
        }

        /**
         * XMLHttpRequest Error
         */
        const xmlHttpErrorMonitor = () => {
            const originXhrOpen = XMLHttpRequest.prototype.open
            const originXhrSend = XMLHttpRequest.prototype.send
            const addResult = this.addResult.bind(this)
            let XMLMethod = 'GET'
            XMLHttpRequest.prototype.open = function (method, url) {
                XMLMethod = method
                originXhrOpen.apply(this, arguments)
            }
            XMLHttpRequest.prototype.send = function (data) {
                const _this = this
                originXhrSend.call(_this, data)
                const oldOnReadyStateChange = _this.onreadystatechange
                _this.onreadystatechange = function () {
                    if (_this.readyState === 4 && !/20[1-9]/.test(_this.status)) {
                        const xmlHttpError = {
                            type: 'XMLHttpRequestError',
                            src: _this.responseURL,
                            method: XMLMethod,
                            status: _this.status,
                            response: _this.responseText
                        }
                        addResult('ajax', xmlHttpError)
                    }
                    oldOnReadyStateChange && oldOnReadyStateChange.apply(_this, arguments)
                }
            }
        }

        /**
         * 通过重写document.createElement自动为script添加crossOrigin
         */
        const crossOriginScriptErrorMonitor = () => {
            document.createElement = (function () {
                const fn = document.createElement.bind(document)
                return function (type) {
                    const result = fn(type)
                    if (type === 'script') {
                        result.crossOrigin = 'anonymous'
                    }
                    return result
                }
            })()
        }

        /**
         * 上报数据
         */
        const uploadResult = () => {
            const oldOnload = window.onload
            window.onload = e => {
                if (oldOnload && typeof oldOnload === 'function') {
                    oldOnload(e)
                }
                // 尽量不影响页面主线程
                if (window.requestIdleCallback) {
                    window.requestIdleCallback(this.uploadMonitorLogs.bind(this))
                } else {
                    setTimeout(this.uploadMonitorLogs.bind(this))
                }
            }
        }

        rewriteWindowOnerror()
        resourceErrorMonitor()
        promiseErrorMonitor()
        ajaxErrorMonitor()
        uploadResult()
        crossOriginScriptErrorMonitor()
    }
}
