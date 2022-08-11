import { Constructor, TypeKeys } from 'web-utility';
import { action, observable } from 'mobx';

import { service } from './service';

export abstract class BaseModel {
    @observable
    downloading = 0;

    @observable
    uploading = 0;

    @action
    clear() {
        this.downloading = this.uploading = 0;

        return this;
    }
}

export function toggle<T extends BaseModel>(
    property: TypeKeys<T, boolean | number>
) {
    return (target: any, key: string, meta: PropertyDescriptor) => {
        const origin = meta.value as (...data: any[]) => Promise<any>;

        meta.value = async function (this: T, ...data: any[]) {
            var value = Reflect.get(this, property);

            const isNumber = typeof value === 'number';

            Reflect.set(this, property, isNumber ? ++value : true);

            try {
                return await origin.apply(this, data);
            } finally {
                value = Reflect.get(this, property);

                Reflect.set(this, property, isNumber ? --value : false);
            }
        };
    };
}

export type IDType = number | string;

export type DataObject = Record<string, any>;

export type NewData<T extends DataObject> = {
    [K in Exclude<keyof T, TypeKeys<T, DataObject>>]?: T[K];
} & {
    [K in TypeKeys<T, DataObject>]?: IDType;
};

export abstract class BaseListModel<D extends DataObject> extends BaseModel {
    abstract baseURI: string;

    @observable
    currentOne: D = {} as D;

    static createNested(parentId: IDType) {
        const Model = this as unknown as Constructor<BaseListModel<{}>>;

        const store = new Model();

        store.baseURI = store.baseURI.replace(/:\w+/, parentId + '');

        return store;
    }

    clear() {
        this.currentOne = {} as D;

        return super.clear();
    }

    @toggle('uploading')
    async updateOne(data: NewData<D>, id?: IDType) {
        const { body } = await (id
            ? service.patch<D>(`${this.baseURI}/${id}`, data)
            : service.post<D>(this.baseURI, data));

        return (this.currentOne = body);
    }

    @toggle('downloading')
    async getOne(id: IDType) {
        const { body } = await service.get<D>(`${this.baseURI}/${id}`);

        return (this.currentOne = body);
    }

    @toggle('uploading')
    async removeOne(id: IDType) {
        await service.delete(`${this.baseURI}/${id}`);
    }
}
