# MobX RESTful

Common [MobX][1] **abstract base Class & [Decorator][2]** utilities for [RESTful API][3].

Just define your **Data models** & **Client HTTP methods**, then leave rest of things to MobX!

[![MobX compatibility](https://img.shields.io/badge/Compatible-1?logo=mobx&label=MobX%206%2F7)][1]
[![NPM Dependency](https://img.shields.io/librariesio/github/idea2app/MobX-RESTful.svg)][4]
[![CI & CD](https://github.com/idea2app/MobX-RESTful/actions/workflows/main.yml/badge.svg)][5]

[![NPM](https://nodei.co/npm/mobx-restful.png?downloads=true&downloadRank=true&stars=true)][6]

## Versions

|  SemVer   |    status    | ES decorator |    MobX     |
| :-------: | :----------: | :----------: | :---------: |
| `>=0.7.0` | ✅developing |   stage-3    |  `>=6.11`   |
| `<0.7.0`  | ❌deprecated |   stage-2    | `>=4 <6.11` |

## Usage

### `package.json`

```json
{
    "dependencies": {
        "koajax": "^3.1.0",
        "mobx": "^6.13.5",
        "mobx-restful": "^2.1.0"
    }
}
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
import { Filter, ListModel } from 'mobx-restful';
import { components } from '@octokit/openapi-types';

import { client } from './client';

export type Organization = components['schemas']['organization-full'];
export type Repository = components['schemas']['minimal-repository'];

export class RepositoryModel<
    D extends Repository = Repository,
    F extends Filter<D> = Filter<D>
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

Use [WebCell][10] as an Example

```tsx
import { component, observer } from 'web-cell';

import repositoryStore from '../model/Repository';

@component({ tagName: 'repository-page' })
@observer
export class RepositoryPage extends HTMLElement {
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
                    <li key={full_name}>
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
    declare baseURI: string;
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

### Data Persistence

`@persist()` & `restore()` functions give us a declarative way to save & restore data to/from [IndexedBD][11], such as these following examples:

#### User Session

```ts
import { observable } from 'mobx';
import { BaseModel, persist, restore, toggle } from 'mobx-restful';
import { Day } from 'web-utility';

import { client } from './client';
import { User } from './User';

export class SessionModel extends BaseModel {
    baseURI = 'session';
    client = client;

    @persist({ expireIn: 15 * Day })
    @observable
    user?: User;

    restored = restore(this, 'Session');

    @toggle('uploading')
    async signIn(username: string, password: string) {
        const { body } = await this.client.post<User>('session', {
            username,
            password
        });
        return (this.user = body);
    }
}

export default new Session();
```

#### File Downloader

This module has been moved to [MobX-downloader][12] since MobX-RESTful v2.

#### List Cache

##### `model/Party/Gift.ts`

```ts
import { ListModel, persistList } from 'mobx-restful';

import { Gift } from '@my-scope/service-type';

import { client } from './client';

@persistList({
    storeKey: ({ partyId }) => `PartyGift-${partyId}`,
    expireIn: 2 * Day
})
export class PartyGiftModel extends ListModel<Gift> {
    baseURI = 'party';
    client = client;

    constructor(public partyId: number) {
        super();
        this.baseURI += `/${partyId}/gift`;
    }

    protected async loadPage(pageIndex: number, pageSize: number) {
        const { body } = await this.client.get<{
            count: number;
            list: Gift[];
        }>(`${this.baseURI}?${buildURLData({ pageIndex, pageSize })}`);

        return { pageData: body.list, totalCount: body.count };
    }
}
```

##### `page/Party/Gift.tsx`

This example page uses [Cell Router][13] to pass in `partyId` route parameter:

```tsx
import { observable } from 'mobx';
import { component, observer, attribute } from 'web-cell';

import { PartyGiftModel } from '../../model/Party/Gift';

@component({ tagName: 'party-gift-page' })
@observer
export class PartyGiftPage extends HTMLElement {
    @attribute
    @observable
    accessor partyId = 0;

    @observable
    accessor store: PartyGiftModel | undefined;

    async connectedCallback() {
        this.store = new PartyGiftModel(this.partyId);

        await this.store.restored;
        // this calling will do nothing after the first loading
        // in list cache period
        await this.store.getAll();
    }

    render() {
        const { allItem } = this.store || {};

        return (
            <>
                <h1>Gift wall</h1>
                <ol>
                    {allItem.map(({ name, price }) => (
                        <li key={name}>
                            {name} - {price}
                        </li>
                    ))}
                </ol>
            </>
        );
    }
}
```

## Wrapper

1. [Strapi v4](https://github.com/idea2app/MobX-RESTful/blob/main/wrapper/Strapi)
2. [GitHub](https://github.com/idea2app/MobX-GitHub)
3. [Lark/FeiShu](https://github.com/idea2app/MobX-Lark)

## Component

1. [Table, List & Form suite](https://github.com/idea2app/MobX-RESTful-table)

## Scaffold

1.  Client-side Rendering (React): https://github.com/idea2app/React-MobX-Bootstrap-ts
2.  Client-side Rendering (Vue): https://github.com/idea2app/Vue-MobX-Prime-ts
3.  Server-side Rendering (React): https://github.com/idea2app/Next-Bootstrap-ts
4.  Cross-end App (React): https://github.com/idea2app/Taro-Vant-MobX-ts

## Limitation

- [ ] [`abstract` hint of Mixin is missing][14]

[1]: https://mobx.js.org/
[2]: https://github.com/tc39/proposal-decorators
[3]: https://en.wikipedia.org/wiki/Representational_state_transfer
[4]: https://libraries.io/npm/mobx-restful
[5]: https://github.com/idea2app/MobX-RESTful/actions/workflows/main.yml
[6]: https://nodei.co/npm/mobx-restful/
[7]: https://yarnpkg.com/
[8]: https://pnpm.io/
[9]: https://joyeecheung.github.io/blog/2024/03/18/require-esm-in-node-js/
[10]: https://github.com/EasyWebApp/WebCell
[11]: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
[12]: https://github.com/idea2app/MobX-downloader
[13]: https://github.com/EasyWebApp/cell-router
[14]: https://github.com/microsoft/TypeScript/issues/39752#issuecomment-1239810720
