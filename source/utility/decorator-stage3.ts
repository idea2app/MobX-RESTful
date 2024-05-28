import { reaction, toJS } from 'mobx';
import { TypeKeys, isEmpty } from 'web-utility';

import { BaseModel } from '../Base';

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

    for (const { key, get, set } of list) {
        const itemKey = `${storeKey}-${key as string}`;

        const value = await load(itemKey);

        const patchedValue = get?.(value) ?? value;

        if (patchedValue != null) {
            Reflect.set(classInstance, key, patchedValue);

            restoredData[key] = patchedValue;
        }

        reaction(
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

    for (const { key } of list) {
        const itemKey = `${storeKey}-${key as string}`;

        await del(itemKey);
    }
}
