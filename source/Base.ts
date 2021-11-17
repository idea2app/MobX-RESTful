import type { TypeKeys } from 'web-utility';
import { observable, computed } from 'mobx';
import {
    HTTPMethod,
    HTTPAuthorizationSchema,
    IDType,
    NewData
} from './utility';

export interface PageData<T> {
    keyword?: string;
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    list: T[];
}

export type PageFilter<C, P> = Omit<PageData<C>, 'list'> & NewData<C, P>;

export abstract class BaseStore<
    C,
    P,
    F extends PageFilter<C, P> = PageFilter<C, P>
> implements PageData<C>
{
    static setAuthorization?: (
        value: string,
        type?: HTTPAuthorizationSchema
    ) => any;

    abstract request<T = C>(
        method: HTTPMethod,
        path: string,
        body?: any,
        header?: Record<string, string>
    ): Promise<T>;

    abstract requestPage(path: string, filter?: F): Promise<PageData<C>>;

    abstract path: string;

    @observable
    loading = false;

    @observable
    updating = false;

    @observable
    current: C = {} as C;

    @observable
    keyword?: string;

    @observable
    pageIndex = 1;

    @observable
    pageSize = 10;

    @observable
    totalCount = 0;

    @observable
    list: C[] = [];

    @computed
    get totalPage() {
        return Math.ceil(this.totalCount / this.pageSize);
    }

    @computed
    get noMore() {
        return this.pageIndex >= this.totalPage;
    }

    clearCurrent() {
        this.current = {} as C;
    }

    clearList() {
        this.list = [];
    }

    @toggle('updating')
    async updateOne(data: NewData<C, P>, id?: IDType) {
        const full = await (id
            ? this.request('PUT', `${this.path}/${id}`, data)
            : this.request('POST', this.path, data));

        return (this.current = full);
    }

    @toggle('loading')
    async getOne(id: IDType) {
        const full = await this.request('GET', `${this.path}/${id}`);

        return (this.current = full);
    }

    @toggle('updating')
    deleteOne(id: IDType) {
        return this.request<void>('DELETE', `${this.path}/${id}`);
    }

    @toggle('loading')
    async getList(filter?: F) {
        const data = await this.requestPage(this.path, filter);

        Object.assign(this, data);

        return this.list;
    }
}

export function toggle<T extends BaseStore<any, any> = BaseStore<any, any>>(
    statusKey: TypeKeys<T, boolean>
) {
    return (target: any, key: string, meta: PropertyDescriptor) => {
        const origin: (...data: any[]) => Promise<any> = meta.value;

        meta.value = async function (this: T, ...data: any[]) {
            Reflect.set(this, statusKey, true);
            try {
                return await origin.apply(this, data);
            } finally {
                Reflect.set(this, statusKey, false);
            }
        };
    };
}
