import { TypeKeys } from 'web-utility';
import { stringify } from 'qs';
import { observable, computed } from 'mobx';
import { IDType, DataObject, NewData, ListModel, toggle } from 'mobx-restful';

export interface StrapiDataItem<
    A extends DataObject,
    M extends DataObject = DataObject
> {
    id: number;
    attributes: StrapiNestedData<A>;
    meta: M;
}

export interface StrapiItemWrapper<
    A extends DataObject,
    M extends DataObject = DataObject
> {
    data: StrapiDataItem<A>;
    meta?: M;
}

export interface StrapiListWrapper<A extends DataObject> {
    data: StrapiDataItem<A>[];
    meta?: {
        pagination: Record<'page' | 'pageSize' | 'pageCount' | 'total', number>;
    };
}

export type StrapiNestedData<T extends DataObject> = {
    [K in keyof T]: T[K] extends DataObject[]
        ? StrapiListWrapper<T[K]>
        : T[K] extends DataObject
        ? StrapiItemWrapper<T[K]>
        : T[K];
};

export abstract class StrapiListModel<
    D extends DataObject,
    F extends NewData<D> = NewData<D>
> extends ListModel<D, F> {
    searchKeys: Exclude<TypeKeys<D, string>, this['indexKey']>[] = [];

    @observable
    keywords = '';

    @computed
    get searchFilter() {
        const words = this.keywords.split(/\s+/);

        const $or = this.searchKeys
            .map(key => words.map(word => ({ [key]: { $containsi: word } })))
            .flat();

        return { $or };
    }

    protected normalize = ({ id, attributes }: StrapiDataItem<D>) => {
        const data = Object.fromEntries(
            Object.entries(attributes).map(([key, value]) => [
                key,
                value?.data
                    ? Array.isArray(value.data)
                        ? (value as StrapiListWrapper<any>).data.map(
                              this.normalize
                          )
                        : this.normalize(value.data)
                    : value
            ])
        ) as D;

        return { id, ...data };
    };

    @toggle('downloading')
    async getOne(id: IDType) {
        const { body } = await this.client.get<StrapiItemWrapper<D>>(
            `${this.baseURI}/${id}`
        );
        return (this.currentOne = this.normalize(body!.data));
    }

    @toggle('uploading')
    async updateOne(data: NewData<D>, id?: IDType) {
        const { body } = await (id
            ? this.client.patch<StrapiItemWrapper<D>>(`${this.baseURI}/${id}`, {
                  data
              })
            : this.client.post<StrapiItemWrapper<D>>(this.baseURI, { data }));

        return (this.currentOne = this.normalize(body!.data));
    }

    async loadPage(pageIndex: number, pageSize: number, filter: F) {
        const filters = Object.fromEntries(
            Object.entries(filter).map(([key, value]) => [key, { $eq: value }])
        );
        const { body } = await this.client.get<StrapiListWrapper<D>>(
            `${this.baseURI}?${stringify(
                {
                    filters: this.keywords ? this.searchFilter : filters,
                    pagination: { page: pageIndex, pageSize }
                },
                { encodeValuesOnly: true }
            )}`
        );
        return {
            pageData: body!.data.map(this.normalize),
            totalCount: body!.meta.pagination.total
        };
    }

    search(keywords: string, pageIndex: number, pageSize: number) {
        this.keywords = keywords;

        return this.getList({} as F, pageIndex, pageSize);
    }
}
