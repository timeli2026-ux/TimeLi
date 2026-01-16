import {
  escapeHtml,
  sanitizeForAttribute,
  stripHtml,
  normalizeWhitespace,
  normalizeUnicode,
  sanitizeUserInput,
} from '../sanitize'

describe('escapeHtml', () => {
  it('escapes ampersand to &amp;', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar')
  })

  it('escapes less-than to &lt;', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b')
  })

  it('escapes greater-than to &gt;', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b')
  })

  it('escapes double quote to &quot;', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('escapes single quote to &#x27;', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s')
  })

  it('handles combined XSS attack vector', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('handles null gracefully', () => {
    expect(escapeHtml(null as unknown as string)).toBe('')
  })

  it('handles undefined gracefully', () => {
    expect(escapeHtml(undefined as unknown as string)).toBe('')
  })

  it('preserves safe characters', () => {
    expect(escapeHtml('Hello World 123!')).toBe('Hello World 123!')
  })
})

describe('sanitizeForAttribute', () => {
  it('escapes double quotes', () => {
    expect(sanitizeForAttribute('hello "world"')).toBe('hello &quot;world&quot;')
  })

  it('escapes single quotes', () => {
    expect(sanitizeForAttribute("hello 'world'")).toBe('hello &#x27;world&#x27;')
  })

  it('removes null bytes', () => {
    expect(sanitizeForAttribute('hello\0world')).toBe('helloworld')
  })

  it('removes control characters except tab, newline, carriage return', () => {
    // Bell character (0x07) should be removed
    expect(sanitizeForAttribute('hello\x07world')).toBe('helloworld')
    // Tab, newline, carriage return should be preserved
    expect(sanitizeForAttribute('hello\tworld')).toBe('hello\tworld')
    expect(sanitizeForAttribute('hello\nworld')).toBe('hello\nworld')
    expect(sanitizeForAttribute('hello\rworld')).toBe('hello\rworld')
  })

  it('escapes backslashes', () => {
    expect(sanitizeForAttribute('path\\to\\file')).toBe('path\\\\to\\\\file')
  })

  it('preserves safe characters', () => {
    expect(sanitizeForAttribute('Hello World 123!')).toBe('Hello World 123!')
  })

  it('handles null gracefully', () => {
    expect(sanitizeForAttribute(null as unknown as string)).toBe('')
  })

  it('handles undefined gracefully', () => {
    expect(sanitizeForAttribute(undefined as unknown as string)).toBe('')
  })
})

describe('stripHtml', () => {
  it('removes simple tags like <script>', () => {
    expect(stripHtml('<script>code</script>')).toBe('code')
  })

  it('removes div tags', () => {
    expect(stripHtml('<div>content</div>')).toBe('content')
  })

  it('removes span tags', () => {
    expect(stripHtml('<span>text</span>')).toBe('text')
  })

  it('removes tags with attributes', () => {
    expect(stripHtml('<a href="http://example.com">link</a>')).toBe('link')
  })

  it('handles nested tags', () => {
    expect(stripHtml('<div><span>text</span></div>')).toBe('text')
  })

  it('preserves text content between tags', () => {
    expect(stripHtml('Hello <b>World</b>!')).toBe('Hello World!')
  })

  it('handles self-closing tags like <br/>', () => {
    expect(stripHtml('line1<br/>line2')).toBe('line1line2')
  })

  it('handles self-closing tags like <img/>', () => {
    expect(stripHtml('text<img src="x"/>more')).toBe('textmore')
  })

  it('handles self-closing tags with space', () => {
    expect(stripHtml('line1<br />line2')).toBe('line1line2')
  })

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('')
  })

  it('handles null gracefully', () => {
    expect(stripHtml(null as unknown as string)).toBe('')
  })

  it('handles undefined gracefully', () => {
    expect(stripHtml(undefined as unknown as string)).toBe('')
  })
})

describe('normalizeWhitespace', () => {
  it('collapses multiple spaces to single space', () => {
    expect(normalizeWhitespace('hello    world')).toBe('hello world')
  })

  it('converts tabs to spaces', () => {
    expect(normalizeWhitespace('hello\tworld')).toBe('hello world')
  })

  it('trims leading whitespace', () => {
    expect(normalizeWhitespace('   hello')).toBe('hello')
  })

  it('trims trailing whitespace', () => {
    expect(normalizeWhitespace('hello   ')).toBe('hello')
  })

  it('handles newlines by collapsing multiple to single', () => {
    expect(normalizeWhitespace('hello\n\nworld')).toBe('hello\nworld')
  })

  it('normalizes Windows-style line endings', () => {
    expect(normalizeWhitespace('hello\r\nworld')).toBe('hello\nworld')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeWhitespace('')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeWhitespace('   \t   ')).toBe('')
  })

  it('handles null gracefully', () => {
    expect(normalizeWhitespace(null as unknown as string)).toBe('')
  })

  it('handles undefined gracefully', () => {
    expect(normalizeWhitespace(undefined as unknown as string)).toBe('')
  })
})

describe('normalizeUnicode', () => {
  it('normalizes combining characters', () => {
    // e followed by combining acute accent (U+0301) should become e with acute (U+00E9)
    const decomposed = 'e\u0301' // e + combining acute
    const composed = '\u00E9' // e with acute (single character)
    expect(normalizeUnicode(decomposed)).toBe(composed)
  })

  it('preserves already normalized text', () => {
    const text = 'Hello World'
    expect(normalizeUnicode(text)).toBe(text)
  })

  it('handles empty input', () => {
    expect(normalizeUnicode('')).toBe('')
  })

  it('handles null gracefully', () => {
    expect(normalizeUnicode(null as unknown as string)).toBe('')
  })

  it('handles undefined gracefully', () => {
    expect(normalizeUnicode(undefined as unknown as string)).toBe('')
  })

  it('normalizes multiple combining characters', () => {
    // n followed by combining tilde (U+0303) should become n with tilde (U+00F1)
    const decomposed = 'n\u0303'
    const composed = '\u00F1'
    expect(normalizeUnicode(decomposed)).toBe(composed)
  })
})

describe('sanitizeUserInput', () => {
  it('combines all sanitization steps', () => {
    const input = '  <script>alert("xss")</script>  hello   world  '
    const result = sanitizeUserInput(input)
    expect(result).toBe('alert("xss") hello world')
  })

  it('respects maxLength parameter', () => {
    const input = 'Hello World'
    expect(sanitizeUserInput(input, { maxLength: 5 })).toBe('Hello')
  })

  it('handles null gracefully (returns empty string)', () => {
    expect(sanitizeUserInput(null as unknown as string)).toBe('')
  })

  it('handles undefined gracefully (returns empty string)', () => {
    expect(sanitizeUserInput(undefined as unknown as string)).toBe('')
  })

  it('handles very long strings with maxLength', () => {
    const longString = 'a'.repeat(1000)
    expect(sanitizeUserInput(longString, { maxLength: 10 })).toBe('aaaaaaaaaa')
  })

  it('removes null bytes', () => {
    expect(sanitizeUserInput('hello\0world')).toBe('helloworld')
  })

  it('strips HTML tags', () => {
    expect(sanitizeUserInput('<div>content</div>')).toBe('content')
  })

  it('normalizes whitespace', () => {
    expect(sanitizeUserInput('hello    world')).toBe('hello world')
  })

  it('normalizes unicode', () => {
    const decomposed = 'cafe\u0301' // cafe + combining acute on e
    const result = sanitizeUserInput(decomposed)
    expect(result).toBe('caf\u00E9') // cafe with e-acute
  })

  it('handles mixed content', () => {
    const input = '  <b>Hello</b>\0   World\n\n\t!\u0301  '
    const result = sanitizeUserInput(input)
    // Strips <b> tags, removes null byte, normalizes whitespace
    expect(result).toContain('Hello')
    expect(result).toContain('World')
  })

  it('does not truncate if maxLength not provided', () => {
    const input = 'Hello World'
    expect(sanitizeUserInput(input)).toBe('Hello World')
  })

  it('does not truncate if string is shorter than maxLength', () => {
    expect(sanitizeUserInput('Hello', { maxLength: 10 })).toBe('Hello')
  })
})
