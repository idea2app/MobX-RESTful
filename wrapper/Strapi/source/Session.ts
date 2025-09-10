import { components } from '@octokit/openapi-types';
import { clear } from 'idb-keyval';
import { HTTPClient, HTTPError } from 'koajax';
import { observable } from 'mobx';
import { BaseModel, NewData, persist, restore, toggle } from 'mobx-restful';

export type Base = Record<'documentId' | 'createdAt' | 'updatedAt', string> & {
    id: number;
};
export type BaseUser = Partial<
    Base &
        Record<'username' | 'email' | 'provider', string> &
        Record<'confirmed' | 'blocked', boolean>
>;
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

export class SessionModel<T extends BaseUser = BaseUser> extends BaseModel {
    @persist()
    @observable
    accessor accessToken = new URLSearchParams(globalThis.location?.search).get(
        'access_token'
    );

    @persist()
    @observable
    accessor jwt = '';

    @persist()
    @observable
    accessor user: T | undefined;

    @persist()
    @observable
    accessor userGithub: GithubUser | undefined;

    restored = restore(this, 'Session');

    client = new HTTPClient({
        baseURI: 'http://localhost:1337/api/',
        responseType: 'json'
    }).use(async ({ request }, next) => {
        await this.restored;

        request.headers = {
            ...request.headers,
            'Strapi-Response-Format': 'v4'
        };
        if (this.jwt) request.headers['Authorization'] = `Bearer ${this.jwt}`;

        return next();
    });

    oAuthLinkOf = (provider: OAuthProvider) =>
        new URL(`connect/${provider}`, this.client.baseURI) + '';

    @toggle('uploading')
    async signInOauth(token = this.accessToken, provider = 'github') {
        const { body } = await this.client.get<{ jwt: string; user: T }>(
            `auth/${provider}/callback?access_token=${token}`
        );
        Object.assign(this, body);

        return this.getProfile(body.user.id);
    }

    async signOut() {
        await clear();

        location.replace('');
    }

    @toggle('downloading')
    async getProfile(id = this.user?.id) {
        try {
            const { body } = await this.client.get<T>(`users/${id || 'me'}`);

            return (this.user = body);
        } catch (error) {
            if ((error as HTTPError).response.status !== 400) throw error;
        }
    }

    @toggle('downloading')
    async getGithubProfile(name: string) {
        const { body } = await this.client.get<GithubUser>(
            'https://api.github.com/users/' + name,
            { Authorization: `Bearer ${this.accessToken}` }
        );

        return (this.userGithub = body);
    }

    @toggle('uploading')
    async updateProfile({ id = this.user?.id, ...data }: NewData<BaseUser>) {
        const { body } = await this.client.put<T>('users/' + id, data);

        return (this.user = body);
    }

    @toggle('uploading')
    async upload(
        model: string,
        id: string,
        key: string,
        files: Blob[],
        module?: string
    ) {
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
