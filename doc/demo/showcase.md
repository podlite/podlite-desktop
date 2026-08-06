# Markdown highlighting showcase

A Markdown file opens as Markdown: the editor highlights the source as Markdown
and the preview renders it as Markdown.

## Text

**Bold**, *italic*, ***both***, `inline code`, ~~struck out~~, and a
[link](https://podlite.org).

> A blockquote, with **markup** inside it.

## Lists

- a bullet
- another one
  - nested
- [ ] a task still open
- [x] a task already done

1. first
2. second
3. third

## Fenced code by language

```js
const editor = createEditor({ language: 'markdown' })
editor.on('change', doc => preview.render(doc))
```

```python
def fib(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

```rust
fn main() {
    let langs = vec!["podlite", "markdown"];
    println!("{}", langs.join(" and "));
}
```

```sql
select month, sum(units) as total
from sales
group by month
order by total desc;
```

## A fence carrying settings

The settings that follow the language read in their own colour, here and in a
Podlite document alike:

```js :caption<a titled snippet> :id<snippet-1>
export const version = '0.9.0'
```

## Table

| Delimiter | Reads as | Note                 |
| --------- | -------- | -------------------- |
| `<a b>`   | list     | whitespace separates |
| `<a,b>`   | string   | a comma stays        |
| `('a b')` | string   | quotes keep it whole |

## Image

![Podlite](../podlite-mark-desktop.svg)

---

Rules, footnotes[^1] and HTML pass through as well.

[^1]: a footnote at the bottom of the file.
