import { get, set } from 'idb-keyval';
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
    return (target: any, key: string, meta: PropertyDescriptor) => {
        const origin = meta.value as (...data: any[]) => Promise<any>;

        meta.value = async function (this: T, ...data: any[]) {
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
    };
}

const PersistKeys = new WeakMap<any, string[]>();

export function persist(target: any, key: string) {
    const keys = PersistKeys.get(target) || [];

    keys.push(key);

    PersistKeys.set(target, keys);
}

export type PersistPatcher<T> = {
    [K in keyof T]?: {
        get?: (value: any) => T[K];
        set?: (value: T[K]) => any;
    };
};

export async function onRestore<T extends object>(
    storeKey: string,
    classInstance: T,
    patcher?: PersistPatcher<T>
) {
    const keys = PersistKeys.get(Object.getPrototypeOf(classInstance)) as
            | (keyof T)[]
            | undefined,
        restoredData = {} as Partial<T>;

    for (const key of keys || []) {
        const itemKey = `${storeKey}-${key as string}`;

        const value = await get(itemKey);

        const patchedValue = patcher?.[key]?.get?.(value) ?? value;

        if (patchedValue != null) {
            Reflect.set(classInstance, key, patchedValue);

            restoredData[key] = patchedValue;
        }

        reaction(
            () => classInstance[key],
            value => {
                const patchedValue = patcher?.[key]?.set?.(value);

                return set(itemKey, patchedValue ?? toJS(value));
            }
        );
    }
    if (isEmpty(restoredData)) return;

    console.group(`Restored ${storeKey}`);
    console.table(restoredData);
    console.groupEnd();
}
