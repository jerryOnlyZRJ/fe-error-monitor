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
    constructor(options = {}) {
        this.options = options
        this.xhr = new XMLHttpRequest()
        this.monitorResult = {}
    }
    addResult(type, result = {}) {
        result.time = new Date().getTime()
        result.url = window.location.href
        if (this.monitorResult[type]) {
            this.monitorResult[type].push(result)
        } else {
            this.monitorResult[type] = [result]
        }
    }
    init() {
        //  重写window.onerror
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
        // 监听资源加载错误
        window.addEventListener('error', e => {
            if (e.target === window) {
                return
            }
            const errorObject = e.target
            this.xhr.open('HEAD', errorObject.src)
            this.xhr.send()
            this.xhr.onload = response => {
                const resourceErrorMonitorResult = {
                    type: 'ResourceError',
                    outerHTML: errorObject.outerHTML,
                    src: errorObject.src,
                    status: response.status
                }
                this.addResult('resourceError', resourceErrorMonitorResult)
            }
            return false
        }, true)
        // 监听PromiseError
        window.addEventListener('unhandledrejection', error => {
            const unhandledrejectionError = {
                type: 'Unhandledrejection',
                message: error.reason
            }
            this.addResult('unhandledrejection', unhandledrejectionError)
        })
        // 监控AJAX Error
        // fetch error
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
        // XMLHttpRequest
        // const originXhrOpen = XMLHttpRequest.prototype.open
        // const originXhrSend = XMLHttpRequest.prototype.send
        // const addResult = this.addResult
        // let XMLMethod = 'GET'
        // XMLHttpRequest.prototype.open = function (method, url) {
        //     XMLMethod = method
        //     originXhrOpen.apply(this, arguments)
        // }
        // XMLHttpRequest.prototype.send = function (data) {
        //     const _this = this
        //     originXhrSend.call(_this, data)
        //     const oldOnReadyStateChange = _this.onreadystatechange
        //     _this.onreadystatechange = function () {
        //         if (_this.readyState === 4 && !/20[1-9]/.test(_this.status)) {
        //             const xmlHttpError = {
        //                 type: 'XMLHttpRequestError',
        //                 src: _this.responseURL,
        //                 method: XMLMethod,
        //                 status: _this.status,
        //                 response: _this.responseText
        //             }
        //             addResult('ajax', xmlHttpError)
        //         }
        //         oldOnReadyStateChange && oldOnReadyStateChange.apply(_this, arguments)
        //     }
        // }
    }
}