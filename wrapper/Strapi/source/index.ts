import { stringify } from 'qs';
import { IDType, DataObject, NewData, ListModel, toggle } from 'mobx-restful';

export interface StrapiDataItem<
    A extends DataObject,
    M extends DataObject = DataObject
> {
    id: number;
    attributes: A;
    meta: M;
}

export interface StrapiItemWrapper<
    A extends DataObject,
    M extends DataObject = DataObject
> {
    data: StrapiDataItem<A>;
    meta: M;
}

export interface StrapiListWrapper<A extends DataObject> {
    data: StrapiDataItem<A>[];
    meta: {
        pagination: Record<'page' | 'pageSize' | 'pageCount' | 'total', number>;
    };
}

export abstract class StrapiListModel<
    D extends DataObject,
    F extends NewData<D> = NewData<D>
> extends ListModel<D, F> {
    protected normalize({ id, attributes }: StrapiDataItem<D>): D {
        return { id, ...attributes };
    }

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
            ? this.client.patch<StrapiItemWrapper<D>>(
                  `${this.baseURI}/${id}`,
                  data
              )
            : this.client.post<StrapiItemWrapper<D>>(this.baseURI, data));

        return (this.currentOne = this.normalize(body!.data));
    }

    async loadPage(pageIndex: number, pageSize: number, filter: F) {
        const filters = Object.fromEntries(
            Object.entries(filter).map(([key, value]) => [key, { $eq: value }])
        );
        const { body } = await this.client.get<StrapiListWrapper<D>>(
            `${this.baseURI}?${stringify({
                filters,
                pagination: { page: pageIndex, pageSize }
            })}`
        );
        return {
            pageData: body!.data.map(this.normalize),
            totalCount: body!.meta.pagination.total
        };
    }
}
