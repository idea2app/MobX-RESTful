# MobX-Strapi

[MobX][1] SDK for [Strapi][2] headless CMS

[![MobX compatibility](https://img.shields.io/badge/Compatible-1?logo=mobx&label=MobX%206%2F7)][1]
[![NPM Dependency](https://img.shields.io/librariesio/release/npm/mobx-strapi)][3]
[![](https://raw.githubusercontent.com/sindresorhus/awesome/main/media/mentioned-badge.svg)][4]

[![NPM](https://nodei.co/npm/mobx-strapi.png?downloads=true&downloadRank=true&stars=true)][5]

## Version

|    SemVer    |    branch     |    status    | ES decorator |    MobX     | Strapi |
| :----------: | :-----------: | :----------: | :----------: | :---------: | :----: |
|   `>=0.5`    |    `main`     | ✅developing |   stage-3    |  `>=6.11`   |   v4   |
| `>=0.3 <0.5` |    `main`     | ❌deprecated |   stage-2    | `>=4 <6.11` |   v4   |
|    `<0.3`    | [`master`][6] | ❌deprecated |   stage-2    |  `>=4 <6`   |   v3   |

## Usage

### Installation

```shell
npm i mobx-restful mobx-strapi koajax
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

### `model/service.ts`

```javascript
import { HTTPClient } from 'koajax';

export const strapiClient = new HTTPClient({
    baseURI: 'http://your.production.domain/path/optional',
    responseType: 'json'
});
```

### `model/Article.ts`

```typescript
import { StrapiListModel } from 'mobx-strapi';

import { strapiClient } from './service';

export type Article = Record<'id' | 'title' | 'summary', string>;

export class ArticleModel extends StrapiListModel<Article> {
    client = strapiClient;
    baseURI = 'articles';
}

export default new ArticleModel();
```

### `page/Article/index.tsx`

Use [WebCell][7] as an Example

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
[2]: https://strapi.io/
[3]: https://libraries.io/npm/mobx-strapi
[4]: https://github.com/strapi/awesome-strapi
[5]: https://nodei.co/npm/mobx-strapi/
[6]: https://github.com/idea2app/MobX-RESTful/tree/master
[7]: https://github.com/EasyWebApp/WebCell
