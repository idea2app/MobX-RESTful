import { Constructor } from 'web-utility';
import { observable, action } from 'mobx';
import {
    IDType,
    DataObject,
    NewData,
    InvalidMessage,
    RESTClient,
    toggle
} from './utility';

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

export abstract class BaseListModel<D extends DataObject> extends BaseModel {
    abstract client: RESTClient;
    abstract baseURI: string;

    @observable
    currentOne: D = {} as D;

    @observable
    validity: InvalidMessage<D> = {};

    static createNested(parentId: IDType) {
        const Model = this as unknown as Constructor<BaseListModel<{}>>;

        const store = new Model();

        store.baseURI = store.baseURI.replace(/:\w+/, parentId + '');

        return store;
    }

    clear() {
        this.currentOne = {} as D;
        this.validity = {};

        return super.clear();
    }

    @toggle('uploading')
    async updateOne(data: NewData<D>, id?: IDType) {
        const { body } = await (id
            ? this.client.patch<D>(`${this.baseURI}/${id}`, data)
            : this.client.post<D>(this.baseURI, data));

        return (this.currentOne = body);
    }

    @toggle('downloading')
    async getOne(id: IDType) {
        const { body } = await this.client.get<D>(`${this.baseURI}/${id}`);

        return (this.currentOne = body);
    }

    @toggle('uploading')
    async removeOne(id: IDType) {
        await this.client.delete(`${this.baseURI}/${id}`);
    }
}
