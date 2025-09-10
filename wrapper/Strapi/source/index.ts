import { AbstractClass, IndexKey, TypeKeys } from 'web-utility';
import { stringify } from 'qs';
import { computed, observable } from 'mobx';
import {
    IDType,
    DataObject,
    NewData,
    Filter,
    ListModel,
    toggle
} from 'mobx-restful';

import { Base } from './Session';

export * from './Session';

export interface StrapiDataItem<
    A extends DataObject,
    M extends DataObject = DataObject
> {
    id: number;
    documentId?: string;
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

export type NotableOperator<T extends string> =
    | `$${T}`
    | `$not${Capitalize<T>}`;

export type CaseInsensitive<T extends `$${string}`> = T | `${T}i`;

export type StrapiFilterOperator =
    | CaseInsensitive<'$eq'>
    | CaseInsensitive<'$ne'>
    | `$${'l' | 'g'}t${'' | 'e'}`
    | NotableOperator<'in'>
    | CaseInsensitive<NotableOperator<'contains'>>
    | NotableOperator<'null'>
    | '$between'
    | CaseInsensitive<`$${'start' | 'end'}sWith`>
    | '$or'
    | '$and'
    | '$not';
export type StrapiFilterValue<T = any> = Record<StrapiFilterOperator, T>;

export type StrapiFilter<Index extends IndexKey> =
    | Record<string, StrapiFilterValue | Record<Index, StrapiFilterValue>>
    | Partial<Record<StrapiFilterOperator, StrapiFilter<Index>[]>>;

export type StrapiPopulateQuery<D extends DataObject> = {
    [K in TypeKeys<D, DataObject | DataObject[]>]?: {
        populate:
            | '*'
            | (Required<D>[K] extends (infer I)[]
                  ? TypeKeys<I, DataObject | DataObject[]>
                  : TypeKeys<Required<D>[K], DataObject>);
    };
};

export abstract class StrapiListModel<
    D extends Base,
    F extends Filter<D> = Filter<D>
> extends ListModel<D, F> {
    operator = {
        createdAt: '$startsWith',
        updatedAt: '$startsWith'
    } as Partial<Record<keyof D, StrapiFilterOperator>>;

    populate: StrapiPopulateQuery<D> = {};

    protected normalize({ id, documentId, attributes }: StrapiDataItem<D>) {
        const data = Object.fromEntries(
            Object.entries(attributes).map(([key, value]) => [
                key,
                value?.data
                    ? Array.isArray(value.data)
                        ? (value as StrapiListWrapper<any>).data.map(item =>
                              this.normalize(item)
                          )
                        : this.normalize(value.data)
                    : value
            ])
        ) as D;

        return { id, documentId, ...data } as D;
    }

    @toggle('downloading')
    async getOne(id: IDType) {
        const { populate } = this;

        const { body } = await this.client.get<StrapiItemWrapper<D>>(
            `${this.baseURI}/${id}?${stringify({ populate }, { encodeValuesOnly: true })}`
        );
        return (this.currentOne = this.normalize(body!.data));
    }

    @toggle('uploading')
    async updateOne(data: NewData<D>, id?: IDType) {
        const { body } = await (id
            ? this.client.put<StrapiItemWrapper<D>>(`${this.baseURI}/${id}`, {
                  data
              })
            : this.client.post<StrapiItemWrapper<D>>(this.baseURI, { data }));

        return (this.currentOne = this.normalize(body!.data));
    }

    makeFilter(pageIndex: number, pageSize: number, filter: F) {
        const { indexKey, operator, populate } = this;

        const filters = Object.fromEntries(
            Object.entries(filter).map(([key, value]) => [
                key,
                key in populate
                    ? { [indexKey]: { $eq: value } }
                    : { [key in operator ? operator[key] : '$eq']: value }
            ])
        ) as StrapiFilter<typeof indexKey>;

        return { populate, filters, pagination: { page: pageIndex, pageSize } };
    }

    async loadPage(pageIndex: number, pageSize: number, filter: F) {
        const { body } = await this.client.get<StrapiListWrapper<D>>(
            `${this.baseURI}?${stringify(
                this.makeFilter(pageIndex, pageSize, filter),
                { encodeValuesOnly: true }
            )}`
        );
        return {
            pageData: body!.data.map(item => this.normalize(item)),
            totalCount: body!.meta.pagination.total
        };
    }
}

export type SearchableFilter<D extends DataObject> = Filter<D> & {
    keywords?: string;
};

export function Searchable<
    D extends Base,
    F extends SearchableFilter<D> = SearchableFilter<D>,
    M extends AbstractClass<StrapiListModel<D, F>> = AbstractClass<
        StrapiListModel<D, F>
    >
>(Super: M) {
    abstract class SearchableListMixin extends Super {
        searchKeys: readonly TypeKeys<D, string>[] = [];

        @observable
        accessor keywords = '';

        @computed
        get searchFilter() {
            const words = this.keywords.split(/\s+/);

            type OrFilter = Record<TypeKeys<D, string>, { $containsi: string }>;

            const $or = this.searchKeys
                .map(key =>
                    words.map(word => ({ [key]: { $containsi: word } }))
                )
                .flat() as OrFilter[];

            return { $or };
        }

        makeFilter(pageIndex: number, pageSize: number, filter: F) {
            const { populate, keywords } = this;

            return keywords
                ? {
                      populate,
                      filters: this.searchFilter,
                      pagination: { page: pageIndex, pageSize }
                  }
                : super.makeFilter(pageIndex, pageSize, filter);
        }

        getList(
            { keywords, ...filter }: F,
            pageIndex = 1,
            pageSize = this.pageSize
        ) {
            if (keywords) this.keywords = keywords;

            return this.getList(filter as F, pageIndex, pageSize);
        }
    }
    return SearchableListMixin;
}
