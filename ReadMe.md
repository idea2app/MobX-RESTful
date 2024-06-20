# MobX RESTful

Common [MobX][1] **abstract base Class & Decorator** utilities for [RESTful API][2].

Just define your **Data models** & **Client HTTP methods**, then leave rest of things to MobX!

[![MobX compatibility](https://img.shields.io/badge/Compatible-1?logo=mobx&label=MobX%206%2F7)][1]
[![NPM Dependency](https://img.shields.io/librariesio/github/idea2app/MobX-RESTful.svg)][3]
[![CI & CD](https://github.com/idea2app/MobX-RESTful/actions/workflows/main.yml/badge.svg)][4]

[![NPM](https://nodei.co/npm/mobx-restful.png?downloads=true&downloadRank=true&stars=true)][5]

## Versions

|  SemVer   |    status    | ES decorator |    MobX     |
| :-------: | :----------: | :----------: | :---------: |
| `>=0.7.0` | ✅developing |   stage-3    |  `>=6.11`   |
| `<0.7.0`  | ❌deprecated |   stage-2    | `>=4 <6.11` |

## Usage

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

Use [WebCell][6] as an Example

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

### File Downloader

Here is an example:

-   [Downloader component](https://github.com/idea2app/React-MobX-Bootstrap-ts/blob/master/src/component/Downloader.tsx)
-   [Downloader view](https://github.com/idea2app/React-MobX-Bootstrap-ts/blob/master/src/page/Downloader.tsx)

## Wrapper

1. [Strapi v4](https://github.com/idea2app/MobX-RESTful/blob/main/wrapper/Strapi)
2. [GitHub](https://github.com/idea2app/MobX-GitHub)
3. [Lark/FeiShu](https://github.com/idea2app/MobX-Lark)

## Component

1. [Table, List & Form suite](https://github.com/idea2app/MobX-RESTful-table)

## Scaffold

1.  Client-side Rendering (React): https://github.com/idea2app/Next-Bootstrap-ts
2.  Server-side Rendering (React): https://github.com/idea2app/React-MobX-Bootstrap-ts
3.  Cross-end App (React): https://github.com/idea2app/Taro-Vant-MobX-ts

## Limitation

-   [ ] [`abstract` hint of Mixin is missing][7]

[1]: https://mobx.js.org/
[2]: https://en.wikipedia.org/wiki/Representational_state_transfer
[3]: https://libraries.io/npm/mobx-restful
[4]: https://github.com/idea2app/MobX-RESTful/actions/workflows/main.yml
[5]: https://nodei.co/npm/mobx-restful/
[6]: https://github.com/EasyWebApp/WebCell
[7]: https://github.com/microsoft/TypeScript/issues/39752#issuecomment-1239810720
