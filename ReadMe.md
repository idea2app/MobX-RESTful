# MobX RESTful

Common [MobX][1] 4/5 **abstract base Class & Decorator** utilities for [RESTful API][2].

Just define your **Data models** & **Client HTTP methods**, then leave rest of things to MobX!

[![CI & CD](https://github.com/idea2app/MobX-RESTful/actions/workflows/main.yml/badge.svg)][3]

[![NPM](https://nodei.co/npm/mobx-restful.png?downloads=true&downloadRank=true&stars=true)][4]

## Usage

### Simple List

#### `model/client.ts`

```javascript
import { HTTPClient } from 'koajax';

export const client = new HTTPClient({
    baseURI: 'https://api.github.com/',
    responseType: 'json'
});
```

#### `model/Repository.ts`

```typescript
import { buildURLData } from 'web-utility';
import { NewData, ListModel } from 'mobx-restful';
import { components } from '@octokit/openapi-types';

import { client } from './client';

export type Organization = components['schemas']['organization-full'];
export type Repository = components['schemas']['minimal-repository'];

export class RepositoryModel<
    D extends Repository = Repository,
    F extends NewData<D> = NewData<D>
> extends ListModel<D, F> {
    client = client;
    baseURI = 'orgs/idea2app/repos';

    async loadPage(page: number, per_page: number) {
        const { body } = await this.client.get<D[]>(
            `${this.baseURI}?${buildURLData({ page, per_page })}`
        );
        const [_, organization] = this.baseURI.split('/');
        const {
            body: { public_repos }
        } = await this.client.get<Organization>(`orgs/${organization}`);

        return { pageData: body, totalCount: public_repos };
    }
}

export default new RepositoryModel();
```

#### `page/Repository.tsx`

Use [WebCell][5] as an Example

```tsx
import { WebCell, component, observer, createCell } from 'web-cell';

import repositoryStore from '../model/Repository';

@component({
    tagName: 'repository-page'
})
@observer
export class RepositoryPage extends WebCell() {
    connectedCallback() {
        repositoryStore.getList();
    }

    disconnectedCallback() {
        repositoryStore.clear();
    }

    render() {
        const { currentPage } = repositoryStore;

        return (
            <ul>
                {currentPage.map(({ full_name, html_url }) => (
                    <li>
                        <a target="_blank" href={html_url}>
                            {full_name}
                        </a>
                    </li>
                ))}
            </ul>
        );
    }
}
```

### Preload List

#### `model/PreloadRepository.ts`

```typescript
import { buildURLData } from 'web-utility';
import { Buffer } from 'mobx-restful';

import { client } from './client';
import { Repository, RepositoryModel } from './Repository';

export class PreloadRepositoryModel extends Buffer<Repository>(
    RepositoryModel
) {
    client = client;
    baseURI = 'orgs/idea2app/repos';

    loadPage = RepositoryModel.prototype.loadPage;
}

export default new PreloadRepositoryModel();
```

### Multiple Source List

#### `model/MultipleRepository.ts`

```typescript
import { buildURLData, mergeStream } from 'web-utility';
import { Stream } from 'mobx-restful';
import { components } from '@octokit/openapi-types';

import { client } from './client';
import { Repository, RepositoryModel } from './Repository';

export type User = components['schemas']['public-user'];

export class MultipleRepository extends Stream<Repository>(RepositoryModel) {
    client = client;

    async *getOrgRepos() {
        const {
            body: { public_repos }
        } = await this.client.get<Organization>('orgs/idea2app');

        this.totalCount = public_repos;

        for (let i = 1; ; i++) {
            const { body } = await this.client.get<Repository[]>(
                'orgs/idea2app/repos?page=' + i
            );
            if (!body[0]) break;

            yield* body;
        }
    }

    async *getUserRepos() {
        const {
            body: { public_repos }
        } = await this.client.get<User>('users/TechQuery');

        this.totalCount = public_repos;

        for (let i = 1; ; i++) {
            const { body } = await this.client.get<Repository[]>(
                'users/TechQuery/repos?page=' + i
            );
            if (!body[0]) break;

            yield* body;
        }
    }

    openStream() {
        return mergeStream(
            this.getOrgRepos.bind(this),
            this.getUserRepos.bind(this)
        );
    }
}

export default new MultipleRepository();
```

## Wrapper

1. [Strapi v4](https://github.com/idea2app/MobX-RESTful/blob/main/wrapper/Strapi)

## Component

1. [Table, List & Form suite](https://github.com/idea2app/MobX-RESTful-table)

## Scaffold

1.  Client-side Rendering (React): https://github.com/idea2app/Next-Bootstrap-ts
2.  Server-side Rendering (React): https://github.com/idea2app/React-MobX-Bootstrap-ts
3.  Cross-end App (React): https://github.com/idea2app/Taro-Vant-MobX-ts

## Limitation

-   [ ] [`abstract` hint of Mixin is missing][6]

[1]: https://mobx.js.org/
[2]: https://en.wikipedia.org/wiki/Representational_state_transfer
[3]: https://github.com/idea2app/MobX-RESTful/actions/workflows/main.yml
[4]: https://nodei.co/npm/mobx-restful/
[5]: https://github.com/EasyWebApp/WebCell
[6]: https://github.com/microsoft/TypeScript/issues/39752#issuecomment-1239810720
