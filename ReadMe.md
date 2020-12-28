# MobX-Strapi

[MobX][1] SDK for [Strapi][2] v3 (headless CMS)

[![NPM Dependency](https://david-dm.org/EasyWebApp/MobX-Strapi.svg)][3]
[![CI & CD](https://github.com/EasyWebApp/MobX-Strapi/workflows/CI%20&%20CD/badge.svg)][4]
[![](https://raw.githubusercontent.com/sindresorhus/awesome/main/media/mentioned-badge.svg)][5]

[![NPM](https://nodei.co/npm/mobx-strapi.png?downloads=true&downloadRank=true&stars=true)][6]

## Example

https://github.com/kaiyuanshe/PWA/tree/master/src/model

## Usage

### `model/index.ts`

```JavaScript
import { service } from 'mobx-strapi';

import { SampleModel } from './Sample';

if (self.location.hostname !== 'localhost')
    service.baseURI = 'http://your.production.domain/path/optional';

export const sample = new SampleModel();
```

### `model/Sample.ts`

```TypeScript
import { BaseData, MediaData, CollectionModel } from 'mobx-strapi';

export interface Sample extends BaseData {
    file: MediaData;
}

export class SampleModel extends CollectionModel<Sample> {
    name = 'sample';
    basePath = 'samples';
}
```

### `page/Sample.tsx`

Use [WebCell][7] as an Example

```JSX
import { component, mixin, createCell } from 'web-cell';
import { observer } from 'mobx-web-cell';

import { sample } from '../model';

@observer
@component({
    tagName: 'sample-page'
})
export class SamplePage extends mixin() {
    connectedCallback() {
        sample.getOne()
    }

    render() {
        const { file } = sample.current;

        return <img src={file?.url} />;
    }
}
```

[1]: https://mobx.js.org/
[2]: https://strapi.io/
[3]: https://david-dm.org/EasyWebApp/MobX-Strapi
[4]: https://github.com/EasyWebApp/MobX-Strapi/actions
[5]: https://github.com/strapi/awesome-strapi
[6]: https://nodei.co/npm/mobx-strapi/
[7]: https://github.com/EasyWebApp/WebCell
