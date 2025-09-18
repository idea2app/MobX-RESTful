import { TypeKeys } from 'web-utility';
import { HTTPClient, Context } from 'koajax';

export type IDType = number | string;

export type DataObject = Record<string, any>;

export type NewData<
    D extends DataObject,
    N extends DataObject = DataObject
> = Omit<D, TypeKeys<D, N> | TypeKeys<D, N[]>> & {
    [K in TypeKeys<D, N>]: IDType | D[K];
} & {
    [K in TypeKeys<D, N[]>]: IDType[] | D[K];
};

export type RESTClient = Pick<
    HTTPClient<Context>,
    | 'baseURI'
    | 'options'
    | 'request'
    | 'get'
    | 'post'
    | 'put'
    | 'patch'
    | 'delete'
>;
