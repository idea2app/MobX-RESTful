# MobX-Supabase

[MobX][1] SDK for [Supabase][2] BaaS

[![MobX compatibility](https://img.shields.io/badge/Compatible-1?logo=mobx&label=MobX%206%2F7)][1]
[![NPM Dependency](https://img.shields.io/librariesio/release/npm/mobx-supabase)][3]

[![NPM](https://nodei.co/npm/mobx-supabase.png?downloads=true&downloadRank=true&stars=true)][4]

## Usage

### Installation

```shell
npm i mobx-supabase
```

### `tsconfig.json`

```json
{
    "compilerOptions": {
        "target": "ES6",
        "moduleResolution": "Node",
        "useDefineForClassFields": true,
        "experimentalDecorators": false,
        "jsx": "react-jsx"
    }
}
```

### `model/Base.ts`

```typescript
import { createClient } from 'mobx-supabase';

export interface Base {
    id: number;
    createdAt: string;
}

export const supabaseClient = createClient(
    process.env.SUPABASE_API_HOST!,
    process.env.SUPABASE_API_KEY!
);
```

### `model/Article.ts`

```typescript
import { SupabaseListModel } from 'mobx-supabase';

import { Base, supabaseClient } from './Base';

export interface Article extends Base, Record<'title' | 'summary', string> {}

export class ArticleModel extends SupabaseListModel<Article> {
    client = supabaseClient;
    baseURI = 'article';
}

export default new ArticleModel();
```

### `page/Article/index.tsx`

Use [WebCell][5] as an Example

```tsx
import { component, observer } from 'web-cell';

import articleStore from '../../model/Article';

@component({ tagName: 'article-page' })
@observer
export class ArticlePage extends HTMLElement {
    connectedCallback() {
        articleStore.getList();
    }

    disconnectedCallback() {
        articleStore.clear();
    }

    render() {
        const { currentPage } = articleStore;

        return (
            <ul>
                {currentPage.map(({ id, title, summary }) => (
                    <li key={id}>
                        <a href={`#/article/${id}`}>{title}</a>
                        <p>{summary}</p>
                    </li>
                ))}
            </ul>
        );
    }
}
```

[1]: https://mobx.js.org/
[2]: https://supabase.io/
[3]: https://libraries.io/npm/mobx-supabase
[4]: https://www.npmjs.com/package/mobx-supabase
[5]: https://github.com/EasyWebApp/WebCell
