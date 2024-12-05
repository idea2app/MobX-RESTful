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

interface PersistMeta<V = any, S = any> {
    key: string;
    set?: (value: V) => S;
    get?: (value?: S) => V;
    disposer?: IReactionDisposer;
}
const PersistKeys = new WeakMap<any, PersistMeta[]>();

export function persist<T, V, S>(patcher: Omit<PersistMeta<V, S>, 'key'> = {}) {
    return (
        {}: ClassAccessorDecoratorTarget<T, V>,
        { name, addInitializer }: ClassAccessorDecoratorContext<T, V>
    ) => {
        addInitializer(function () {
            const list = PersistKeys.get(this) || [];

            list.push({ ...patcher, key: name.toString() });

            PersistKeys.set(this, list);
        });
    };
}

export async function restore<T extends object>(
    classInstance: T,
    storeKey: string
) {
    const { get: load, set: save } = await import('idb-keyval'),
        list = PersistKeys.get(classInstance) || [],
        restoredData = {} as Partial<T>;

    for (const item of list) {
        const { key, set, get } = item,
            itemKey = `${storeKey}-${key as string}`;

        const value = await load(itemKey);

        const patchedValue = get?.(value) ?? value;

        if (patchedValue != null) {
            Reflect.set(classInstance, key, patchedValue);

            restoredData[key] = patchedValue;
        }

        item.disposer = reaction(
            () => classInstance[key],
            value => {
                const patchedValue = set?.(value);

                return save(itemKey, patchedValue ?? toJS(value));
            }
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
    const { del } = await import('idb-keyval'),
        list = PersistKeys.get(classInstance) || [];

    for (const { key, disposer } of list) {
        const itemKey = `${storeKey}-${key as string}`;

        disposer?.();

        await del(itemKey);
    }
}

export interface PersistModel {
    restored?: Promise<void>;
}

export function persistList<
    D extends DataObject,
    F extends Filter<D> = Filter<D>,
    T extends Constructor<ListModel<D, F>> = Constructor<ListModel<D, F>>
>(
    { storeKey } = {} as {
        storeKey: string | ((instance: T) => string);
    }
) {
    return (Super: T, {}: ClassDecoratorContext) =>
        class PersistListModel extends Super {
            restored =
                globalThis.indexedDB &&
                restore(
                    this,
                    typeof storeKey === 'function'
                        ? storeKey(this as T & this)
                        : storeKey
                );
            declare client: RESTClient;
            declare baseURI: string;

            @persist()
            @observable
            accessor pageIndex = 0;

            @persist()
            @observable
            accessor pageSize = 10;

            @persist()
            @observable
            accessor filter = {} as F;

            @persist()
            @observable
            accessor totalCount: number | undefined = undefined;

            @persist()
            @observable
            accessor pageList: D[][] = [];

            declare loadPage: (
                pageIndex: number,
                pageSize: number,
                filter: F
            ) => Promise<PageData<D>>;
        };
}
