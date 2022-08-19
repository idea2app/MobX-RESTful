# MobX-Strapi

[MobX][1] SDK for [Strapi][2] v4 (headless CMS)

[![](https://raw.githubusercontent.com/sindresorhus/awesome/main/media/mentioned-badge.svg)][5]

[![NPM](https://nodei.co/npm/mobx-strapi.png?downloads=true&downloadRank=true&stars=true)][6]

## Usage

```shell
npm i mobx-restful mobx-strapi koajax
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
import { WebCell, component, observer, createCell } from 'web-cell';

import articleStore from '../../model/Article';

@component({
    tagName: 'article-page'
})
@observer
export class ArticlePage extends WebCell() {
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
                    <li>
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
[5]: https://github.com/strapi/awesome-strapi
[6]: https://nodei.co/npm/mobx-strapi/
[7]: https://github.com/EasyWebApp/WebCell