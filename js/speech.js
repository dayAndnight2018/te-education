/**
 * 语音朗读功能模块
 * 使用浏览器的SpeechSynthesis API实现文本朗读
 */
(function() {
    // 检查浏览器是否支持SpeechSynthesis API
    if (!('speechSynthesis' in window)) {
        console.warn('当前浏览器不支持语音朗读功能');
        return;
    }

    // 创建语音朗读控制按钮
    function createSpeechControls() {
        const controls = document.createElement('div');
        controls.id = 'speech-controls';
        controls.className = 'speech-controls';
        
        controls.innerHTML = `
            <button id="speech-toggle" class="speech-btn speech-toggle" title="开始朗读">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
            </button>
            <button id="speech-pause" class="speech-btn speech-pause" title="暂停朗读" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            </button>
            <button id="speech-resume" class="speech-btn speech-resume" title="继续朗读" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            </button>
            <button id="speech-stop" class="speech-btn speech-stop" title="停止朗读" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
            </button>
            <select id="speech-voice" class="speech-voice"></select>
            <input type="range" id="speech-rate" min="0.5" max="2" step="0.1" value="1" class="speech-rate" title="语速">
            <input type="range" id="speech-pitch" min="0.5" max="2" step="0.1" value="1" class="speech-pitch" title="音调">
        `;
        
        document.body.appendChild(controls);
    }

    // 初始化语音列表
    function initVoices() {
        const voiceSelect = document.getElementById('speech-voice');
        const voices = speechSynthesis.getVoices();
        
        // 清空现有选项
        voiceSelect.innerHTML = '';
        
        // 优先选择中文语音
        let hasChineseVoice = false;
        let hasEnglishVoice = false;
        let selectedVoiceSet = false;
        
        // 先添加中文语音
        voices.forEach(voice => {
            if (voice.lang.includes('zh')) {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = voice.name;
                
                // 如果是中文语音，优先选中
                if (!selectedVoiceSet) {
                    option.selected = true;
                    selectedVoiceSet = true;
                }
                
                voiceSelect.appendChild(option);
                hasChineseVoice = true;
            }
        });
        
        // 检查是否有英文语音
        voices.forEach(voice => {
            if (voice.lang.includes('en')) {
                hasEnglishVoice = true;
            }
        });
        
        // 添加分隔线（如果有中文语音且还有英文语音）
        if (hasChineseVoice && hasEnglishVoice) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '-------------------';
            voiceSelect.appendChild(separator);
        }
        
        // 添加英文语音
        voices.forEach(voice => {
            if (voice.lang.includes('en') && !voice.lang.includes('zh')) {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = voice.name;
                
                // 如果还没有选中项，选择默认的英文语音
                if (!selectedVoiceSet && voice.default) {
                    option.selected = true;
                    selectedVoiceSet = true;
                }
                
                voiceSelect.appendChild(option);
            }
        });
        
        // 如果没有中文和英文语音，添加提示信息
        if (voiceSelect.options.length === 0) {
            const option = document.createElement('option');
            option.textContent = '没有可用的中文或英文语音';
            option.disabled = true;
            voiceSelect.appendChild(option);
        } else if (!selectedVoiceSet && voiceSelect.options.length > 0) {
            // 确保至少有一个选中项
            voiceSelect.selectedIndex = 0;
        }
    }

    // 获取页面内容用于朗读
    function getPageContent() {
        const markdownSection = document.querySelector('.markdown-section');
        if (!markdownSection) return '';
        
        // 创建一个临时元素来提取文本，保留标题和段落结构
        const temp = document.createElement('div');
        temp.innerHTML = markdownSection.innerHTML;
        
        // 移除不需要朗读的元素（保留code元素）
        const elementsToRemove = temp.querySelectorAll('script, style, img');
        elementsToRemove.forEach(el => el.remove());
        
        // 处理pre和code元素，为其添加朗读提示
        const codeBlocks = temp.querySelectorAll('pre, code');
        codeBlocks.forEach(el => {
            // 为代码块添加提示词
            const parentEl = el.parentElement;
            const isPre = el.tagName.toLowerCase() === 'pre';
            const isCodeInsidePre = el.tagName.toLowerCase() === 'code' && parentEl.tagName.toLowerCase() === 'pre';
            
            if (isPre) {
                // 对于pre代码块，保留其内容但添加提示词
                const originalContent = el.innerHTML;
                el.innerHTML = '<span class="code-block-label"></span>' + originalContent + '<span class="code-block-label"></span>';
            } else if (!isCodeInsidePre && el.tagName.toLowerCase() === 'code') {
                // 对于内联code元素，保留其内容但添加提示词
                const originalContent = el.textContent;
                el.innerHTML = '<span class="inline-code-label"></span>' + originalContent;
            }
        });
        
        // 获取文本内容，保留换行以保持结构
        let text = '';
        
        // 优先获取标题和段落
        const importantElements = temp.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre, code');
        
        importantElements.forEach(el => {
            if (el.textContent.trim()) {
                // 为不同级别的标题添加适当的提示词
                if (el.tagName.match(/H[1-6]/)) {
                    const level = parseInt(el.tagName[1]);
                    if (level === 1) text += '标题：';
                    else if (level === 2) text += '小节：';
                    else text += '要点：';
                }
                
                // 获取元素文本内容
                let elementText = el.textContent.trim();
                
                // 对于pre元素，添加换行以提高可读性
                if (el.tagName.toLowerCase() === 'pre') {
                    // 替换多余的空行为单个换行
                    elementText = elementText.replace(/\n\s*\n/g, '\n');
                    // 限制每行长度，避免过长
                    const lines = elementText.split('\n');
                    elementText = lines.map(line => line.length > 50 ? line.substring(0, 50) + '...' : line).join('\n');
                }
                
                text += elementText + '。\n';
            }
        });
        
        // 如果重要元素为空，尝试获取所有文本
        if (!text.trim()) {
            text = temp.textContent.trim();
        }
        
        return text;
    }

    // 全局变量用于分段朗读
    window.speechQueue = [];          // 朗读队列
    window.currentSegmentIndex = 0;   // 当前段落索引
    window.isPaused = false;          // 是否暂停
    window.isStopped = false;         // 是否停止
    
    // 将文本分成多个段落，每个段落不超过1000个字符
    function splitTextIntoSegments(text) {
        const segments = [];
        const maxSegmentLength = 1000; // 每个段落的最大长度
        
        for (let i = 0; i < text.length; i += maxSegmentLength) {
            // 尝试在句号处分割，保持语义完整性
            let end = Math.min(i + maxSegmentLength, text.length);
            
            // 如果不是最后一段，尝试找到最近的句号作为分割点
            if (end < text.length) {
                const periodIndex = text.lastIndexOf('。', end);
                const commaIndex = text.lastIndexOf('，', end);
                const spaceIndex = text.lastIndexOf(' ', end);
                
                // 优先在句号处分割，其次是逗号，最后是空格
                if (periodIndex > i) end = periodIndex + 1;
                else if (commaIndex > i) end = commaIndex + 1;
                else if (spaceIndex > i) end = spaceIndex + 1;
            }
            
            segments.push(text.substring(i, end));
        }
        
        return segments;
    }
    
    // 朗读队列中的下一个段落
    function speakNextSegment() {
        // 如果已停止或队列为空，重置状态
        if (window.isStopped || window.speechQueue.length <= window.currentSegmentIndex) {
            resetSpeechControls();
            window.speechQueue = [];
            window.currentSegmentIndex = 0;
            window.isStopped = false;
            window.isPaused = false;
            return;
        }
        
        // 取消当前所有朗读
        speechSynthesis.cancel();
        
        // 获取下一个段落
        const text = window.speechQueue[window.currentSegmentIndex];
        
        // 创建新的语音实例
        const utterance = new SpeechSynthesisUtterance(text);
        
        // 设置语音参数
        const voiceSelect = document.getElementById('speech-voice');
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find(voice => voice.name === voiceSelect.value);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.rate = parseFloat(document.getElementById('speech-rate').value);
        utterance.pitch = parseFloat(document.getElementById('speech-pitch').value);
        utterance.lang = selectedVoice ? selectedVoice.lang : 'zh-CN';
        
        // 设置错误处理
        utterance.onerror = (event) => {
            console.error('语音朗读错误:', event);
            // 尝试继续朗读下一段
            window.currentSegmentIndex++;
            speakNextSegment();
        };
        
        // 朗读结束时继续下一段
        utterance.onend = () => {
            if (!window.isStopped && !window.isPaused) {
                window.currentSegmentIndex++;
                // 添加一个小延迟，使段落之间有短暂停顿
                setTimeout(speakNextSegment, 300);
            }
        };
        
        // 保存当前朗读实例
        window.currentUtterance = utterance;
        
        // 开始朗读
        speechSynthesis.speak(utterance);
    }
    
    // 开始朗读
    function startSpeech() {
        // 重置状态
        speechSynthesis.cancel();
        window.speechQueue = [];
        window.currentSegmentIndex = 0;
        window.isStopped = false;
        window.isPaused = false;
        
        const text = getPageContent();
        if (!text) {
            alert('没有找到可朗读的内容');
            return;
        }
        
        // 将文本分段
        window.speechQueue = splitTextIntoSegments(text);
        
        // 更新按钮状态
        updateSpeechControls(true);
        
        // 开始朗读第一个段落
        speakNextSegment();
    }

    // 更新语音控制按钮状态
    function updateSpeechControls(isSpeaking) {
        document.getElementById('speech-toggle').disabled = isSpeaking;
        document.getElementById('speech-pause').disabled = !isSpeaking;
        document.getElementById('speech-resume').disabled = !isSpeaking;
        document.getElementById('speech-stop').disabled = !isSpeaking;
    }

    // 重置语音控制按钮状态
    function resetSpeechControls() {
        document.getElementById('speech-toggle').disabled = false;
        document.getElementById('speech-pause').disabled = true;
        document.getElementById('speech-resume').disabled = true;
        document.getElementById('speech-stop').disabled = true;
        window.currentUtterance = null;
        // 重置状态变量
        window.speechQueue = [];
        window.currentSegmentIndex = 0;
        window.isPaused = false;
        window.isStopped = false;
    }

    // 添加事件监听器
    function addEventListeners() {
        // 开始朗读按钮
        document.getElementById('speech-toggle').addEventListener('click', startSpeech);
        
        // 暂停按钮
        document.getElementById('speech-pause').addEventListener('click', () => {
            speechSynthesis.pause();
            window.isPaused = true;
            document.getElementById('speech-resume').disabled = false;
            document.getElementById('speech-pause').disabled = true;
        });
        
        // 继续按钮
        document.getElementById('speech-resume').addEventListener('click', () => {
            if (window.isPaused) {
                // 对于分段朗读，我们不使用resume，而是从当前段落继续
                window.isPaused = false;
                speakNextSegment();
            } else {
                speechSynthesis.resume();
            }
            document.getElementById('speech-resume').disabled = true;
            document.getElementById('speech-pause').disabled = false;
        });
        
        // 停止按钮
        document.getElementById('speech-stop').addEventListener('click', () => {
            speechSynthesis.cancel();
            window.isStopped = true;
            resetSpeechControls();
        });
        
        // 语音列表变化时更新
        speechSynthesis.onvoiceschanged = initVoices;
    }

    // 创建页面内的'阅读本文'按钮
    function createPageSpeechButton() {
        // 等待markdown内容加载完成
        setTimeout(() => {
            const markdownSection = document.querySelector('.markdown-section');
            if (!markdownSection) return;
            
            // 移除可能存在的旧按钮
            const existingButton = document.getElementById('read-this-page');
            if (existingButton) {
                existingButton.remove();
            }
            
            // 创建阅读按钮
            const readButton = document.createElement('button');
            readButton.id = 'read-this-page';
            readButton.className = 'read-this-page-btn';
            readButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
                阅读本文
            `;
            
            // 添加点击事件，确保读取当前页面内容
            readButton.addEventListener('click', startSpeech);
            
            // 添加到markdown内容区域的顶部
            markdownSection.insertBefore(readButton, markdownSection.firstChild);
        }, 1000); // 延迟确保markdown内容已完全渲染
    }
    
    // 监听docsify页面切换事件
    function listenForPageChanges() {
        // docsify使用的事件
        if (window.$docsify) {
            // 页面切换完成后重新创建按钮
            window.$docsify.plugins = [
                function(hook) {
                    // 内容渲染完成后触发
                    hook.afterEach(function() {
                        createPageSpeechButton();
                    });
                }
            ].concat(window.$docsify.plugins || []);
        }
        
        // 同时使用通用DOM变化监听作为后备
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    const markdownSection = document.querySelector('.markdown-section');
                    if (markdownSection && mutation.target === markdownSection) {
                        // 如果markdown内容发生变化，重新创建按钮
                        createPageSpeechButton();
                    }
                }
            });
        });
        
        // 开始观察markdown-section的变化
        const markdownSection = document.querySelector('.markdown-section');
        if (markdownSection) {
            observer.observe(markdownSection, {
                childList: true,
                subtree: true
            });
        }
    }

    // 初始化语音朗读功能
    function initSpeech() {
        // 创建控制界面
        createSpeechControls();
        
        // 创建页面内的阅读按钮
        createPageSpeechButton();
        
        // 初始化语音列表
        initVoices();
        
        // 添加事件监听器
        addEventListeners();
        
        // 监听页面切换事件
        listenForPageChanges();
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSpeech);
    } else {
        // 如果页面已经加载完成，直接初始化
        setTimeout(initSpeech, 1000); // 延迟一下确保markdown内容已渲染
    }

    // 添加CSS样式到页面
    function addSpeechStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .speech-controls {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                border-radius: 25px;
                padding: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 5px;
                transition: all 0.3s ease;
            }
            
            .speech-controls:hover {
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
            }
            
            .speech-btn {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: none;
                background: var(--primary-color, #42b983);
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                padding: 0;
            }
            
            .speech-btn:hover:not(:disabled) {
                background: var(--primary-dark, #3aa876);
                transform: translateY(-2px);
            }
            
            .speech-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
            }
            
            .speech-voice {
                padding: 5px 10px;
                border: 1px solid #ddd;
                border-radius: 15px;
                background: white;
                font-size: 12px;
                outline: none;
                transition: border-color 0.3s ease;
            }
            
            .speech-voice:focus {
                border-color: var(--primary-color, #42b983);
            }
            
            .speech-rate,
            .speech-pitch {
                width: 80px;
                height: 5px;
                border-radius: 3px;
                background: #ddd;
                outline: none;
                -webkit-appearance: none;
            }
            
            .speech-rate::-webkit-slider-thumb,
            .speech-pitch::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 15px;
                height: 15px;
                border-radius: 50%;
                background: var(--primary-color, #42b983);
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .speech-rate::-webkit-slider-thumb:hover,
            .speech-pitch::-webkit-slider-thumb:hover {
                background: var(--primary-dark, #3aa876);
                transform: scale(1.2);
            }
            
            .speech-rate::-moz-range-thumb,
            .speech-pitch::-moz-range-thumb {
                width: 15px;
                height: 15px;
                border-radius: 50%;
                background: var(--primary-color, #42b983);
                cursor: pointer;
                border: none;
            }
            
            /* 页面内阅读按钮样式 */
            .read-this-page-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                margin: 0 0 20px 0;
                background: var(--primary-color, #42b983);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            
            .read-this-page-btn:hover {
                background: var(--primary-dark, #3aa876);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            .read-this-page-btn:active {
                transform: translateY(0);
            }
            
            /* 响应式设计 */
            @media screen and (max-width: 768px) {
                .speech-controls {
                    bottom: 10px;
                    right: 10px;
                    flex-wrap: wrap;
                    max-width: 280px;
                }
                
                .speech-voice {
                    flex: 1 1 100%;
                    margin: 5px 0;
                }
                
                .speech-rate,
                .speech-pitch {
                    width: 60px;
                }
                
                .read-this-page-btn {
                    width: 100%;
                    justify-content: center;
                    padding: 10px 20px;
                    font-size: 14px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 添加样式
    addSpeechStyles();
})();