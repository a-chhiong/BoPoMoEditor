export class TtsEngine {
    static state = 'stopped'; // 'stopped', 'playing', 'paused'
    static timer = null;
    static utterance = null;
    
    // Callbacks
    static onStateChange = null;
    static onHighlight = null;
    static onClearHighlight = null;

    static init(callbacks = {}) {
        this.onStateChange = callbacks.onStateChange || null;
        this.onHighlight = callbacks.onHighlight || null;
        this.onClearHighlight = callbacks.onClearHighlight || null;

        // Fix Chrome TTS voices bug
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }

    static setState(newState) {
        this.state = newState;
        if (this.onStateChange) this.onStateChange(newState);
    }

    static toggle(buildTextFn) {
        if (!window.speechSynthesis) {
            console.warn('SpeechSynthesis API not supported');
            return false;
        }

        if (this.state === 'stopped') {
            return this.start(buildTextFn);
        } else if (this.state === 'playing') {
            this.pause();
            return true;
        } else if (this.state === 'paused') {
            this.resume();
            return true;
        }
        return false;
    }

    static start(buildTextFn) {
        const { textToRead, charMap } = buildTextFn();
        if (!textToRead) return false;

        window.speechSynthesis.cancel();
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.utterance = new SpeechSynthesisUtterance(textToRead);
        this.utterance.lang = 'zh-TW';
        this.utterance.rate = 0.9;

        const voices = window.speechSynthesis.getVoices();
        const twVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-') === 'zh-tw');
        if (twVoice) this.utterance.voice = twVoice;

        // Save to window level global reference to prevent garbage collection on Chrome/Firefox
        window.activeUtterance = this.utterance;

        this.utterance.onstart = () => {
            this.setState('playing');
        };

        this.utterance.onend = () => {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            this.setState('stopped');
        };

        this.utterance.onerror = (e) => {
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.error('TTS error: ', e);
            }
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            this.setState('stopped');
        };

        let simulatedIndex = 0;
        let punctuationTicks = 0;

        // Real-time character boundary tracker (works natively on Safari & calibrates Chrome)
        this.utterance.onboundary = (event) => {
            if (event.name === 'word' || event.name === 'char') {
                const charIdx = event.charIndex;
                simulatedIndex = charIdx;
                punctuationTicks = 0;

                if (charMap && charMap[charIdx] !== undefined) {
                    if (this.onHighlight) this.onHighlight(charMap[charIdx]);
                }
            }
        };

        // Highlight first character immediately
        if (charMap && charMap[0] !== undefined) {
            if (this.onHighlight) this.onHighlight(charMap[0]);
        }

        window.speechSynthesis.speak(this.utterance);
        this.setState('playing');

        // High-precision hybrid fallback timer (runs seamlessly on Chrome, Firefox and Safari)
        const charDurationMs = 240 / this.utterance.rate;
        this.timer = setInterval(() => {
            if (this.state !== 'playing') return;

            const currentChar = textToRead[simulatedIndex];
            const isPunct = /[，。！？；：「」『』、\s\n]/.test(currentChar);
            
            if (isPunct && punctuationTicks < 2) {
                punctuationTicks++;
                return; // pause highlight animation matching voice speech break
            }
            punctuationTicks = 0;

            if (simulatedIndex < textToRead.length - 1) {
                simulatedIndex++;
                if (charMap && charMap[simulatedIndex] !== undefined) {
                    if (this.onHighlight) this.onHighlight(charMap[simulatedIndex]);
                }
            }
        }, charDurationMs);

        return true;
    }

    static pause() {
        window.speechSynthesis.pause();
        this.setState('paused');
    }

    static resume() {
        window.speechSynthesis.resume();
        this.setState('playing');
    }

    static stop() {
        window.speechSynthesis.cancel();
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        window.activeUtterance = null;
        if (this.onClearHighlight) this.onClearHighlight();
        this.setState('stopped');
    }
}
