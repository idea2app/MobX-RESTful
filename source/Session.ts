import { observable } from 'mobx';
import { UsersGetByUsernameResponseData } from '@octokit/types';

import { APIError, service, setToken, github } from './service';
import { BaseData, BaseModel, NewData, loading } from './Base';

export interface BaseUser extends BaseData {
    username: string;
    email: string;
    provider?: string;
    confirmed: boolean;
    blocked: boolean;
    role: any;
}

const { localStorage, location } = self;

export class SessionModel<T extends BaseUser = BaseUser> extends BaseModel {
    @observable
    user?: T;

    @observable
    userGithub?: UsersGetByUsernameResponseData;

    @loading
    async signIn(token: string, provider = 'github') {
        const {
            body: {
                jwt,
                user: { id }
            }
        } = await service.get<{ jwt: string; user: T }>(
            `auth/${provider}/callback?access_token=${token}`
        );
        setToken(jwt);

        return this.getProfile((localStorage.userID = id));
    }

    signOut() {
        localStorage.clear();
        location.replace('');
    }

    @loading
    async getProfile(id = this.user?.id || localStorage.userID) {
        try {
            const { body } = await service.get<T>(`users/${id || 'me'}`);

            return (this.user = body);
        } catch (error) {
            if ((error as APIError).status !== 400) throw error;
        }
    }

    @loading
    async getGithubProfile(name: string) {
        const { body } = await github.get<UsersGetByUsernameResponseData>(
            'users/' + name
        );
        return (this.userGithub = body);
    }

    @loading
    async updateProfile({ id = this.user?.id, ...data }: NewData<BaseUser>) {
        const { body } = await service.put<T>('users/' + id, data);

        return (this.user = body);
    }
}
