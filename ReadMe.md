# MobX-RESTful

Common [MobX][1] 4/5 **abstract base Class & Decorator** utilities for **RESTful API**.

Just define your **Data models** & **Client HTTP methods**, then leave rest of things to MobX!

[![NPM Dependency](https://david-dm.org/idea2app/MobX-RESTful.svg)][2]
[![CI & CD](https://github.com/idea2app/MobX-RESTful/workflows/CI%20&%20CD/badge.svg)][3]
[![](https://raw.githubusercontent.com/sindresorhus/awesome/main/media/mentioned-badge.svg)][4]

[![NPM](https://nodei.co/npm/mobx-strapi.png?downloads=true&downloadRank=true&stars=true)][5]

## Strapi API for example

[MobX-Strapi][6], old version of this package, becomes a high-level wrapper.

[![](https://img.shields.io/badge/open-GitHub.dev-blue)][7]

### `source/store/User.ts`

```typescript
import { IDType, Body, checkInput } from 'mobx-restful';
import { StrapiStore } from 'mobx-strapi';
import { BaseModel, UserModel } from '@your-scope/back-end-model';

export class UserStore extends StrapiStore<UserModel, BaseModel> {
    path = 'user';

    @checkInput()
    async updateOne(@Body() data: UserModel, id?: IDType) {
        return super.updateOne(data, id);
    }
}

export default new UserStore();
```

### `source/index.ts`

```typescript
import userStore from './store/User';

(async () => {
    const { id } = await userStore.updateOne({
        username: 'TechQuery',
        email: 'tech-query@ideapp.dev'
    });
    await userStore.updateOne({ username: 'Chinese Taxpayer', email: '' }, id);

    const { username } = await userStore.getOne(id!);

    console.assert(
        username === 'Chinese Taxpayer',
        'This guy is Chinese Citizen'
    );
    try {
        await userStore.deleteOne(id!);
    } catch {
        console.error('You have no right to remove!');
    }
    const list = await userStore.getList();

    console.log(list);
})();
```

### `source/page/User.tsx`

Use [WebCell][8] as an Example

```jsx
import { component, mixin, createCell } from 'web-cell';
import { observer } from 'mobx-web-cell';

import userStore from '../store';

@observer
@component({
    tagName: 'user-page'
})
export class UserPage extends mixin() {
    connectedCallback() {
        userStore.getList();
    }

    render() {
        const { list } = userStore;

        return (
            <ol>
                {list.map(({ username }) => (
                    <li>{username}</li>
                ))}
            </ol>
        );
    }
}
```

[1]: https://mobx.js.org/
[2]: https://david-dm.org/idea2app/MobX-RESTful
[3]: https://github.com/idea2app/MobX-RESTful/actions
[4]: https://github.com/strapi/awesome-strapi
[5]: https://nodei.co/npm/mobx-strapi/
[6]: https://github.com/idea2app/MobX-RESTful/tree/master/Strapi/
[7]: https://github.dev/idea2app/MobX-RESTful/blob/master/Strapi/test/index.spec.ts
[8]: https://github.com/EasyWebApp/WebCell
