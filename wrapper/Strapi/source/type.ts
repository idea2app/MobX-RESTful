import { components } from '@octokit/openapi-types';
import { DataObject } from 'mobx-restful';
import { IndexKey, TypeKeys } from 'web-utility';

export interface StrapiDataItem<A extends DataObject, M extends DataObject = DataObject> {
    id: number;
    documentId?: string;
    attributes: StrapiNestedData<A>;
    meta: M;
}

export interface StrapiItemWrapper<A extends DataObject, M extends DataObject = DataObject> {
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

export type NotableOperator<T extends string> = `$${T}` | `$not${Capitalize<T>}`;

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

export type StrapiQuery<D extends DataObject> = Partial<{
    filters: StrapiFilter<keyof D>;
    sort: string[];
    pagination: Record<'page' | 'pageSize', number>;
    populate: StrapiPopulateQuery<D>;
}>;

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
