import { components } from '@octokit/openapi-types';
import { clear } from 'idb-keyval';
import { HTTPClient, HTTPError } from 'koajax';
import { observable } from 'mobx';
import { Filter, IDType, NewData, persist, restore, toggle } from 'mobx-restful';
import { stringify } from 'qs';

import { StrapiListModel } from './index';

export type Base = Record<'documentId' | 'createdAt' | 'updatedAt', string> & {
    id: number;
};
export type BaseUser = Base &
    Record<'username' | 'email' | 'provider', string> &
    Record<'confirmed' | 'blocked', boolean>;

export type GithubUser = components['schemas']['public-user'];

export type OAuthProvider =
    | 'auth0'
    | 'cognito'
    | 'cas'
    | 'discord'
    | 'facebook'
    | 'github'
    | 'google'
    | 'instagram'
    | 'keycloak'
    | 'linkedin'
    | 'patreon'
    | 'reddit'
    | 'twitch'
    | 'twitter'
    | 'vk';
export type Media = Base &
    Record<
        | 'name'
        | 'ext'
        | 'mime'
        | 'hash'
        | 'url'
        | 'previewUrl'
        | 'provider'
        | 'alternativeText'
        | 'caption',
        string
    > &
    Record<'width' | 'height' | 'formats' | 'size', number> & {
        provider_metadata: {};
    };

export class UserModel<
    D extends BaseUser = BaseUser,
    F extends Filter<D> = Filter<D>
> extends StrapiListModel<D, F> {
    baseURI = 'users';

    @persist()
    @observable
    accessor accessToken = new URLSearchParams(globalThis.location?.search).get('access_token');

    @persist()
    @observable
    accessor jwt = '';

    @persist()
    @observable
    accessor session: D | undefined;

    @persist()
    @observable
    accessor userGithub: GithubUser | undefined;

    restored = restore(this, 'Session');

    client = new HTTPClient({ responseType: 'json' }).use(async ({ request }, next) => {
        await this.restored;

        request.headers = {
            ...request.headers,
            'Strapi-Response-Format': 'v4'
        };
        if (this.jwt) request.headers['Authorization'] = `Bearer ${this.jwt}`;

        return next();
    });

    constructor(baseURL = 'http://localhost:1337/api/') {
        super();
        this.client.baseURI = baseURL;
    }

    oAuthLinkOf = (provider: OAuthProvider) =>
        new URL(`connect/${provider}`, this.client.baseURI) + '';

    @toggle('uploading')
    async signInOauth(token = this.accessToken, provider = 'github') {
        const { body } = await this.client.get<{ jwt: string; user: D }>(
            `auth/${provider}/callback?access_token=${token}`
        );
        Object.assign(this, body);

        return this.getSession();
    }

    async signOut() {
        await clear();

        location.replace('');
    }

    @toggle('downloading')
    async getSession() {
        try {
            const { body } = await this.client.get<D>(`users/me`);

            return (this.session = body);
        } catch (error) {
            if ((error as HTTPError).response.status !== 400) throw error;
        }
    }

    @toggle('downloading')
    async getGithubProfile(name: string) {
        const { body } = await this.client.get<GithubUser>('https://api.github.com/users/' + name, {
            Authorization: `Bearer ${this.accessToken}`
        });
        return (this.userGithub = body);
    }

    @toggle('downloading')
    async getOne(id: IDType) {
        const { body } = await this.client.get<D>(`users/${id}`);

        return (this.currentOne = body);
    }

    @toggle('uploading')
    async updateOne(data: Partial<NewData<D>>, id?: IDType) {
        const { body } = await (id
            ? this.client.put<D>(`${this.baseURI}/${id}`, data)
            : this.client.post<D>(this.baseURI, data));

        return (this.currentOne = body!);
    }

    async loadPage(pageIndex: number, pageSize: number, filter: F) {
        const query = stringify(this.makeFilter(pageIndex, pageSize, filter), {
            encodeValuesOnly: true
        });
        const [{ body: totalCount }, { body: pageData }] = await Promise.all([
            this.client.get<number>(`${this.baseURI}/count?${query}`),
            this.client.get<D[]>(`${this.baseURI}?${query}`)
        ]);
        return { pageData, totalCount };
    }

    @toggle('uploading')
    async upload(model: string, id: string, key: string, files: Blob[], module?: string) {
        const data = new FormData();

        data.append('ref', model);
        data.append('refId', id + '');
        data.append('field', key);

        if (module) data.append('source', module);

        for (const file of files) data.append('files', file);

        const { body } = await this.client.post<Media>('upload', data);

        return body;
    }
}
