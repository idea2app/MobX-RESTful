import { AbstractClass, makeDateRange, TypeKeys } from 'web-utility';
import { stringify } from 'qs';
import { computed, observable } from 'mobx';
import { IDType, NewData, Filter, ListModel, toggle } from 'mobx-restful';

import {
    Base,
    StrapiDataItem,
    StrapiFilter,
    StrapiFilterOperator,
    StrapiItemWrapper,
    StrapiListWrapper,
    StrapiPopulateQuery,
    StrapiQuery
} from './type';

export abstract class StrapiListModel<
    D extends Base,
    F extends Filter<D> = Filter<D>
> extends ListModel<D, F> {
    operator: Partial<Record<keyof D, StrapiFilterOperator>> = {};

    sort: Partial<Record<keyof D, 'asc' | 'desc'>> = {};

    populate: StrapiPopulateQuery<D> = {};

    dateKeys: readonly TypeKeys<D, string>[] = [];

    normalize({ id, documentId, attributes }: StrapiDataItem<D>) {
        const data = Object.fromEntries(
            Object.entries(attributes).map(([key, value]) => [
                key,
                value?.data
                    ? Array.isArray(value.data)
                        ? (value as StrapiListWrapper<any>).data.map(item => this.normalize(item))
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
    async updateOne(data: Partial<NewData<D>>, id?: IDType) {
        const { body } = await (id
            ? this.client.put<StrapiItemWrapper<D>>(`${this.baseURI}/${id}`, {
                  data
              })
            : this.client.post<StrapiItemWrapper<D>>(this.baseURI, { data }));

        return (this.currentOne = this.normalize(body!.data));
    }

    makeFilter(pageIndex: number, pageSize: number, filter: F): StrapiQuery<D> {
        const { indexKey, operator, populate, dateKeys } = this,
            pagination = { page: pageIndex, pageSize };

        const filters = Object.fromEntries(
            Object.entries(filter).map(([key, value]) => [
                key,
                key in populate
                    ? { [indexKey]: { $eq: value } }
                    : dateKeys.includes(key as TypeKeys<D, string>)
                      ? { $between: makeDateRange(value + '') }
                      : { [key in operator ? operator[key] : '$eq']: value }
            ])
        ) as StrapiFilter<typeof indexKey>;

        const sort = Object.entries(this.sort).map(([key, value]) => `${key}:${value}`);
        return { populate, filters, sort, pagination };
    }

    async loadPage(pageIndex: number, pageSize: number, filter: F) {
        const { body } = await this.client.get<StrapiListWrapper<D>>(
            `${this.baseURI}?${stringify(this.makeFilter(pageIndex, pageSize, filter), {
                encodeValuesOnly: true
            })}`
        );
        return {
            pageData: body!.data.map(item => this.normalize(item)),
            totalCount: body!.meta.pagination.total
        };
    }
}

export type SearchableFilter<D extends Base> = Filter<D> & {
    keywords?: string;
};

export function Searchable<
    D extends Base,
    F extends SearchableFilter<D> = SearchableFilter<D>,
    M extends AbstractClass<StrapiListModel<D, F>> = AbstractClass<StrapiListModel<D, F>>
>(Super: M) {
    abstract class SearchableListMixin extends Super {
        abstract searchKeys: readonly TypeKeys<D, string>[];

        @observable
        accessor keywords = '';

        @computed
        get searchFilter() {
            const words = this.keywords.split(/\s+/);

            type OrFilter = Record<TypeKeys<D, string>, { $containsi: string }>;

            const $or = this.searchKeys
                .map(key => words.map(word => ({ [key]: { $containsi: word } })))
                .flat() as OrFilter[];

            return { $or };
        }

        makeFilter(pageIndex: number, pageSize: number, filter: F) {
            const { populate, keywords } = this,
                pagination = { page: pageIndex, pageSize };

            return keywords
                ? { populate, filters: this.searchFilter, pagination }
                : super.makeFilter(pageIndex, pageSize, filter);
        }

        getList(
            { keywords, ...filter }: F,
            pageIndex = this.pageIndex + 1,
            pageSize = this.pageSize
        ) {
            if (keywords) this.keywords = keywords;

            return super.getList(filter as F, pageIndex, pageSize);
        }
    }
    return SearchableListMixin;
}
