import { IReactionDisposer, observable, reaction, toJS } from 'mobx';
import { Constructor, TypeKeys, isEmpty } from 'web-utility';

import { BaseModel } from '../Base';
import { Filter, ListModel, PageData } from '../List';
import { DataObject, RESTClient } from './type';

export function toggle<T extends BaseModel>(
    property: TypeKeys<T, boolean | number>
) {
    return (
        origin: (...data: any[]) => Promise<any>,
        {}: ClassMethodDecoratorContext
    ) =>
        async function (this: T, ...data: any[]) {
            var value = Reflect.get(this, property);

            Reflect.set(
                this,
                property,
                typeof value === 'number' ? ++value : true
            );

            try {
                return await origin.apply(this, data);
            } finally {
                value = Reflect.get(this, property);

                Reflect.set(
                    this,
                    property,
                    typeof value === 'number' ? --value : false
                );
            }
        };
}

export function toggleNotification<T extends BaseModel>(
    message: string | ((instance: T) => string)
) {
    return (
        origin: (...data: any[]) => Promise<any>,
        {}: ClassMemberDecoratorContext
    ) =>
        async function (this: T, ...data: any[]) {
            const notification = Notification.requestPermission().then(
                permission => {
                    if (permission === 'granted')
                        return new Notification(
                            typeof message === 'function'
                                ? message(this)
                                : message
                        );
                }
            );
            try {
                return await origin.apply(this, data);
            } finally {
                notification.then(notification => notification?.close());
            }
        };
}

export interface PersistMeta<V = any, S = any> {
    key: string;
    value?: V | S;
    set?: (value: V) => S | Promise<S>;
    get?: (value?: S) => V | Promise<V>;
    expireIn?: number;
    disposer?: IReactionDisposer;
}

/**
 * @private
 */
export interface PersistBox<V = any, S = any> {
    value: V | S;
    expireAt?: number;
}

export class PersistNode<V = any, S = any> implements PersistMeta<V, S> {
    key: string;
    value?: V | S;
    set?: (value: V) => S | Promise<S>;
    get?: (value?: S) => V | Promise<V>;
    expireIn?: number;
    disposer?: IReactionDisposer;

    constructor(meta: PersistMeta<V, S>) {
        Object.assign(this, meta);
    }

    async save(storeKey: string, value?: V) {
        if (value != null)
            this.value = toJS((await this.set?.(value)) ?? value);

        const { set } = await import('idb-keyval'),
            data: PersistBox<V, S> = {
                value: this.value,
                expireAt: this.expireIn + Date.now()
            };
        return set(`${storeKey}-${this.key}`, data);
    }

    async load(storeKey: string) {
        const { get, del } = await import('idb-keyval');

        storeKey += `-${this.key}`;

        const { value, expireAt } =
            (await get<PersistBox<V, S>>(storeKey)) ?? {};

        if (expireAt && expireAt < Date.now()) {
            delete this.value;
            return del(storeKey);
        }
        this.value = value;

        return (value != null ? await this.get?.(value as S) : value) ?? value;
    }

    async destroy(storeKey: string) {
        this.disposer?.();

        const { del } = await import('idb-keyval');

        return del(`${storeKey}-${this.key}`);
    }
}

const PersistNodes = new WeakMap<any, PersistNode[]>();

export type PersistFieldMeta<V = any, S = any> = Pick<
    PersistMeta<V, S>,
    'set' | 'get' | 'expireIn'
>;

export function persist<T, V, S>({
    expireIn = Infinity,
    ...meta
}: PersistFieldMeta<V, S> = {}) {
    return (
        {}: ClassAccessorDecoratorTarget<T, V>,
        { name, addInitializer }: ClassAccessorDecoratorContext<T, V>
    ) => {
        addInitializer(function () {
            const list = PersistNodes.get(this) || [];

            list.push(
                new PersistNode({ ...meta, key: name.toString(), expireIn })
            );
            PersistNodes.set(this, list);
        });
    };
}

export async function restore<T extends object>(
    classInstance: T,
    storeKey: string
) {
    if (!globalThis.indexedDB)
        return console.warn(
            'IndexedDB is not found in this runtime engine, MobX-RESTful persistence is disabled.'
        );
    const list = PersistNodes.get(classInstance) || [],
        restoredData = {} as Partial<T>;

    for (const item of list) {
        const { key } = item,
            value = await item.load(storeKey);

        if (value != null) {
            Reflect.set(classInstance, key, value);

            restoredData[key] = value;
        }
        item.disposer = reaction(
            () => classInstance[key],
            value => item.save(storeKey, value)
        );
    }
    if (isEmpty(restoredData)) return;

    console.group(`Restored ${storeKey}`);
    console.table(restoredData);
    console.groupEnd();
}

export async function destroy<T extends object>(
    classInstance: T,
    storeKey: string
) {
    const list = PersistNodes.get(classInstance) || [];

    for (const node of list) await node.destroy(storeKey);
}

export interface PersistModel {
    restored?: Promise<void>;
}

export interface PersistListMeta<T> extends Pick<PersistMeta, 'expireIn'> {
    storeKey: string | ((instance: T) => string);
}

export function persistList<
    D extends DataObject,
    F extends Filter<D> = Filter<D>,
    T extends Constructor<ListModel<D, F>> = Constructor<ListModel<D, F>>
>({ storeKey, expireIn = Infinity } = {} as PersistListMeta<InstanceType<T>>) {
    return (Super: T, {}: ClassDecoratorContext) =>
        class PersistListModel extends Super {
            declare client: RESTClient;
            declare baseURI: string;

            @persist({ expireIn })
            @observable
            accessor pageIndex = 0;

            @persist({ expireIn })
            @observable
            accessor pageSize = 10;

            @persist({ expireIn })
            @observable
            accessor filter = {} as F;

            @persist({ expireIn })
            @observable
            accessor totalCount: number | undefined = undefined;

            @persist({ expireIn })
            @observable
            accessor pageList: D[][] = [];

            restored =
                globalThis.indexedDB &&
                restore(
                    this,
                    typeof storeKey === 'function'
                        ? storeKey(this as InstanceType<T>)
                        : storeKey
                );
            declare loadPage: (
                pageIndex: number,
                pageSize: number,
                filter: F
            ) => Promise<PageData<D>>;
        };
}
