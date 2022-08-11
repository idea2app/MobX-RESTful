# MobX RESTful

[MobX][1] SDK for [RESTful API][2] (which predecessor is [MobX-Strapi][3])

[![CI & CD](https://github.com/idea2app/MobX-RESTful/actions/workflows/main.yml/badge.svg)][4]

[![NPM](https://nodei.co/npm/mobx-restful.png?downloads=true&downloadRank=true&stars=true)][5]

## Usage

### `model/index.ts`

```javascript
import { service } from 'mobx-restful';

service.baseURI = 'https://api.github.com/';

import { RepositoryModel } from './Repository';

export const repositoryStore = new RepositoryModel();
```

### `model/Repository.ts`

```typescript
import { ListModel, service } from 'mobx-restful';

export type Repository = Record<'full_name' | 'html_url', string>;

export class RepositoryModel extends ListModel<Repository> {
    baseURI = 'orgs/idea2app/repos';

    async loadPage(page: number, per_page: number) {
        const { body } = await service.get<Repository[]>(
            `${this.baseURI}?${buildURLData({ page, per_page })}`
        );
        return { pageData: body };
    }
}
```

### `page/Repository.tsx`

Use [WebCell][6] as an Example

```tsx
import { WebCell, component, observer, createCell } from 'web-cell';

import { sample } from '../model';

@component({
    tagName: 'repository-page'
})
@observer
export class RepositoryPage extends WebCell() {
    connectedCallback() {
        repositoryStore.getOne();
    }

    render() {
        const { full_name, html_url } = sample.currentOne;

        return (
            <h1>
                <a target="_blank" href={html_url}>
                    {full_name}
                </a>
            </h1>
        );
    }
}
```

[1]: https://mobx.js.org/
[2]: https://en.wikipedia.org/wiki/Representational_state_transfer
[3]: https://github.com/idea2app/MobX-RESTful/tree/master
[4]: https://github.com/idea2app/MobX-RESTful/actions/workflows/main.yml
[5]: https://nodei.co/npm/mobx-restful/
[6]: https://github.com/EasyWebApp/WebCell
