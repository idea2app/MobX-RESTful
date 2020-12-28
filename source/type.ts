export interface BaseData {
    id: string;
    created_at: string;
    updated_at: string;
    published_at: string;
}

export interface MediaData extends BaseData {
    name: string;
    alternativeText: string;
    caption: string;
    width: number;
    height: number;
    formats: [];
    hash: string;
    ext: string;
    mime: string;
    size: number;
    url: string;
    previewUrl: string;
    provider: string;
    provider_metadata: [];
    related: string;
}

export type NestedData<D extends BaseData> = {
    [K in keyof D]?: D[K] extends MediaData
        ? D[K]
        : D[K] extends MediaData[]
        ? D[K]
        : D[K] extends BaseData
        ? string
        : D[K] extends BaseData[]
        ? string[]
        : D[K];
};

export type NewData<T extends BaseData> = {
    [key in keyof T]?: T[key] extends MediaData
        ? File
        : T[key] extends MediaData[]
        ? File[]
        : T[key] extends BaseData
        ? string
        : T[key] extends BaseData[]
        ? string[]
        : T[key] extends NestedData<BaseData>
        ? string
        : T[key] extends NestedData<BaseData>[]
        ? string[]
        : T[key];
};

export type FileKeys<T> = {
    [K in keyof T]: T[K] extends MediaData ? K : never;
}[keyof T];

export type Query<D extends BaseData> = Omit<NewData<D>, FileKeys<D>> & {
    _sort?: string;
    _start?: number;
    _limit?: number;
    _publicationState?: 'live' | 'preview';
};
