import { TypeKeys } from 'web-utility';
import { HTTPClient, Context } from 'koajax';

export type IDType = number | string;

export type DataObject = Record<string, any>;

export type NewData<T extends DataObject> = Partial<
    Omit<T, TypeKeys<T, DataObject> | TypeKeys<T, DataObject[]>> & {
        [K in TypeKeys<T, DataObject>]: IDType;
    } & {
        [K in TypeKeys<T, DataObject[]>]: IDType[];
    }
>;

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
