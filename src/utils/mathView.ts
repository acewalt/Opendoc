const MATH_SYMBOLS: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ',
    lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ',
    omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π',
    Sigma: 'Σ', Phi: 'Φ', Omega: 'Ω', pm: '±', times: '×', cdot: '·', div: '÷',
    le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', approx: '≈', infty: '∞',
    to: '→', rightarrow: '→', leftarrow: '←', sum: '∑', prod: '∏', int: '∫',
    partial: '∂', nabla: '∇', degree: '°',
}

const OPERATOR_CHARS = new Set(['+', '-', '=', '*', '/', '±', '×', '·', '÷', '<', '>', '≤', '≥', '≠', '≈', ',', ';', ':'])

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

export function normalizeMathSource(value: string): string {
    let source = (value || '').trim()

    if (source.startsWith('$$') && source.endsWith('$$') && source.length >= 4) {
        source = source.slice(2, -2).trim()
    } else if (source.startsWith('$') && source.endsWith('$') && source.length >= 2) {
        source = source.slice(1, -1).trim()
    } else if (source.startsWith('\\(') && source.endsWith('\\)')) {
        source = source.slice(2, -2).trim()
    } else if (source.startsWith('\\[') && source.endsWith('\\]')) {
        source = source.slice(2, -2).trim()
    } else if (source.startsWith('[[') && source.endsWith(']]')) {
        source = source.slice(2, -2).trim()
    }

    return source
}

export function looksLikeMath(value: string): boolean {
    const source = normalizeMathSource(value)
    if (!source) return false

    return /[=+\-*/^_]|\\(?:frac|sqrt|sum|int|alpha|beta|gamma|theta|pi|sigma|omega)|\b(?:sqrt|frac)\s*\(/i.test(source)
}

function findTopLevelChar(source: string, target: string): number {
    let round = 0
    let curly = 0
    let square = 0

    for (let i = 0; i < source.length; i++) {
        const char = source[i]
        if (char === '\\') {
            i += 1
            continue
        }
        if (char === '(') round += 1
        else if (char === ')') round = Math.max(0, round - 1)
        else if (char === '{') curly += 1
        else if (char === '}') curly = Math.max(0, curly - 1)
        else if (char === '[') square += 1
        else if (char === ']') square = Math.max(0, square - 1)
        else if (char === target && round === 0 && curly === 0 && square === 0) return i
    }

    return -1
}

function countTopLevelChar(source: string, target: string): number {
    let count = 0
    let offset = 0
    while (offset < source.length) {
        const index = findTopLevelChar(source.slice(offset), target)
        if (index < 0) break
        count += 1
        offset += index + 1
    }
    return count
}

class MathParser {
    private index = 0

    constructor(private readonly source: string) {}

    parse(): string {
        return this.parseSequence()
    }

    private parseSequence(stop?: string): string {
        const parts: string[] = []

        while (this.index < this.source.length) {
            if (stop && this.source[this.index] === stop) break
            if (/\s/.test(this.source[this.index])) {
                this.index += 1
                parts.push('<mspace width="0.28em"/>')
                continue
            }
            parts.push(this.parseScriptedAtom())
        }

        return `<mrow>${parts.join('')}</mrow>`
    }

    private parseScriptedAtom(): string {
        let base = this.parseAtom()
        let superscript: string | null = null
        let subscript: string | null = null

        while (this.index < this.source.length) {
            const char = this.source[this.index]
            if (char !== '^' && char !== '_') break
            this.index += 1
            const script = this.parseScriptValue()
            if (char === '^') superscript = script
            else subscript = script
        }

        if (superscript && subscript) {
            base = `<msubsup>${base}${subscript}${superscript}</msubsup>`
        } else if (superscript) {
            base = `<msup>${base}${superscript}</msup>`
        } else if (subscript) {
            base = `<msub>${base}${subscript}</msub>`
        }

        return base
    }

    private parseScriptValue(): string {
        this.skipWhitespace()
        if (this.source[this.index] === '{') return this.parseDelimited('{', '}')
        if (this.source[this.index] === '(') return this.parseDelimited('(', ')')
        return this.parseAtom()
    }

    private parseAtom(): string {
        if (this.index >= this.source.length) return '<mrow></mrow>'

        const char = this.source[this.index]

        if (char === '\\') return this.parseCommand()
        if (char === '{') return this.parseDelimited('{', '}')
        if (char === '(') return this.parseFenced('(', ')')
        if (char === '[') return this.parseFenced('[', ']')

        if (this.source.startsWith('sqrt(', this.index)) {
            this.index += 4
            const inner = this.parseDelimited('(', ')')
            return `<msqrt>${inner}</msqrt>`
        }

        if (this.source.startsWith('frac(', this.index)) {
            this.index += 4
            return this.parseFunctionFraction()
        }

        if (/\d|[.,]/.test(char)) {
            const start = this.index
            while (this.index < this.source.length && /[\d.,]/.test(this.source[this.index])) this.index += 1
            return `<mn>${escapeXml(this.source.slice(start, this.index))}</mn>`
        }

        if (/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(char)) {
            const start = this.index
            while (this.index < this.source.length && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(this.source[this.index])) this.index += 1
            const token = this.source.slice(start, this.index)
            const commonFunction = /^(sin|cos|tan|sen|log|ln|lim|max|min)$/i.test(token)
            return commonFunction ? `<mi mathvariant="normal">${escapeXml(token)}</mi>` : `<mi>${escapeXml(token)}</mi>`
        }

        this.index += 1
        if (OPERATOR_CHARS.has(char)) return `<mo>${escapeXml(char)}</mo>`
        return `<mo>${escapeXml(char)}</mo>`
    }

    private parseCommand(): string {
        this.index += 1
        const start = this.index
        while (this.index < this.source.length && /[A-Za-z]/.test(this.source[this.index])) this.index += 1
        const command = this.source.slice(start, this.index)

        if (command === 'frac') {
            this.skipWhitespace()
            const numerator = this.source[this.index] === '{' ? this.parseDelimited('{', '}') : this.parseAtom()
            this.skipWhitespace()
            const denominator = this.source[this.index] === '{' ? this.parseDelimited('{', '}') : this.parseAtom()
            return `<mfrac>${numerator}${denominator}</mfrac>`
        }

        if (command === 'sqrt') {
            this.skipWhitespace()
            const radicand = this.source[this.index] === '{' ? this.parseDelimited('{', '}') : this.parseAtom()
            return `<msqrt>${radicand}</msqrt>`
        }

        const symbol = MATH_SYMBOLS[command]
        if (symbol) {
            const isOperator = ['sum', 'prod', 'int', 'pm', 'times', 'cdot', 'div', 'le', 'leq', 'ge', 'geq', 'neq', 'approx', 'to', 'rightarrow', 'leftarrow'].includes(command)
            return isOperator ? `<mo>${escapeXml(symbol)}</mo>` : `<mi>${escapeXml(symbol)}</mi>`
        }

        if (!command && this.index < this.source.length) {
            const escaped = this.source[this.index]
            this.index += 1
            return `<mo>${escapeXml(escaped)}</mo>`
        }

        return `<mi mathvariant="normal">${escapeXml(command)}</mi>`
    }

    private parseDelimited(open: string, close: string): string {
        if (this.source[this.index] !== open) return '<mrow></mrow>'
        this.index += 1
        const content = this.parseSequence(close)
        if (this.source[this.index] === close) this.index += 1
        return content
    }

    private parseFenced(open: string, close: string): string {
        const inner = this.parseDelimited(open, close)
        return `<mrow><mo stretchy="true">${escapeXml(open)}</mo>${inner}<mo stretchy="true">${escapeXml(close)}</mo></mrow>`
    }

    private parseFunctionFraction(): string {
        if (this.source[this.index] !== '(') return '<mi>frac</mi>'
        this.index += 1
        const start = this.index
        let depth = 0
        let comma = -1

        while (this.index < this.source.length) {
            const char = this.source[this.index]
            if (char === '(' || char === '{' || char === '[') depth += 1
            else if (char === ')' || char === '}' || char === ']') {
                if (char === ')' && depth === 0) break
                depth = Math.max(0, depth - 1)
            } else if (char === ',' && depth === 0 && comma < 0) {
                comma = this.index
            }
            this.index += 1
        }

        const end = this.index
        if (this.source[this.index] === ')') this.index += 1
        if (comma < 0) return `<mi>frac</mi><mrow>${new MathParser(this.source.slice(start, end)).parse()}</mrow>`

        const numerator = new MathParser(this.source.slice(start, comma)).parse()
        const denominator = new MathParser(this.source.slice(comma + 1, end)).parse()
        return `<mfrac>${numerator}${denominator}</mfrac>`
    }

    private skipWhitespace(): void {
        while (this.index < this.source.length && /\s/.test(this.source[this.index])) this.index += 1
    }
}

function renderCore(source: string): string {
    const equality = findTopLevelChar(source, '=')
    if (equality >= 0) {
        const left = source.slice(0, equality)
        const right = source.slice(equality + 1)
        return `<mrow>${renderCore(left)}<mo>=</mo>${renderCore(right)}</mrow>`
    }

    if (countTopLevelChar(source, '/') === 1) {
        const slash = findTopLevelChar(source, '/')
        const numerator = source.slice(0, slash).trim()
        const denominator = source.slice(slash + 1).trim()
        if (numerator && denominator) {
            return `<mfrac>${renderCore(numerator)}${renderCore(denominator)}</mfrac>`
        }
    }

    return new MathParser(source).parse()
}

export function renderMathMl(value: string): string {
    const source = normalizeMathSource(value)
    if (!source) return ''

    return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="${escapeXml(source)}">${renderCore(source)}</math>`
}
