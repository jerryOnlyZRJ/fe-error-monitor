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

class ErrorMonitor {
    constructor(options = {}) {
        this.options = options
        this.monitorResult = {}
    }
    addResult(type, result = {}) {
        result.time = new Date().getTime()
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
            oldWindowOnerror(message, src, line, column, error)
            const onerrorMonitorResult = {
                type: 'Error',
                message,
                url: window.location.href,
                src,
                line,
                column,
                error
            }
            this.addResult('error', onerrorMonitorResult)
        }
        // 监听资源加载错误
        window.addEventListener('error', e => {
            const errorObject = e.target
            var xhr = new XMLHttpRequest()
            xhr.open('HEAD', errorObject.src)
            xhr.send()
            xhr.onload = response => {
                const resourceErrorMonitorResult = {
                    type: 'ResourceError',
                    url: errorObject.baseURI,
                    outerHTML: errorObject.outerHTML,
                    src: errorObject.src,
                    status: response.status
                }
                this.addResult('resourceError', resourceErrorMonitorResult)
            }
            return false
        })

    }
}

export default ErrorMonitor
