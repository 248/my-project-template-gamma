# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - generic [ref=e2]:
        - banner [ref=e3]:
            - heading "Template Gamma" [level=1] [ref=e7]
        - main [ref=e8]:
            - generic [ref=e11]:
                - heading "Welcome to Template Gamma" [level=1] [ref=e12]
                - paragraph [ref=e13]:
                    - text: Next.js 15.5.2 + React 19.0.0 を使用した
                    - text: Cloudflare Workers 対応テンプレート
                - generic [ref=e14]:
                    - link "ログイン" [ref=e15] [cursor=pointer]:
                        - /url: /auth/login
                    - paragraph [ref=e17]: または
                    - link "システム状態を確認" [ref=e18] [cursor=pointer]:
                        - /url: /health
        - contentinfo [ref=e19]:
            - paragraph [ref=e21]: © 2024 Template Gamma. Next.js 15.5.2 + React 19.0.0 + Cloudflare Workers
    - button "Open Next.js Dev Tools" [ref=e27] [cursor=pointer]:
        - img [ref=e28] [cursor=pointer]
    - alert [ref=e31]
```
