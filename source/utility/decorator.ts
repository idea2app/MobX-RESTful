import 'reflect-metadata';
import { Constructor, TypeKeys } from 'web-utility';
import { ValidationError, validateSync } from 'class-validator';

import { BaseModel, BaseListModel } from '../Base';

export function toggle<T extends BaseModel>(
    property: TypeKeys<T, boolean | number>
) {
    return (target: any, key: string, meta: PropertyDescriptor) => {
        const origin = meta.value as (...data: any[]) => Promise<any>;

        meta.value = async function (this: T, ...data: any[]) {
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
    };
}

export function Input(): ParameterDecorator {
    return (target: any, key: string, index) =>
        Reflect.defineMetadata(`mobx-restful-body-${key}`, index, target);
}

export type InvalidMessage<T> = Partial<
    Record<keyof T, ValidationError['constraints']>
>;

export class InvalidError extends Error {
    static from<T>(state: InvalidMessage<T>) {
        const message = Object.entries(state)
            .map(
                ([key, message]) =>
                    `${key}: ${Object.values(message).join(', ')}`
            )
            .join('\n');

        return new this(message);
    }
}

export function validate<T extends BaseListModel<{}>>() {
    return (target: any, key: string, meta: PropertyDescriptor) => {
        const index = Reflect.getMetadata(`mobx-restful-body-${key}`, target);

        const { [index]: Model } = Reflect.getMetadata(
                'design:paramtypes',
                target,
                key
            ) as Constructor<any>[],
            method = meta.value as (...data: any[]) => any;

        meta.value = function (this: T, ...data: any[]) {
            if (Model && data[index] != null) {
                const validator = (data[index] = Object.assign(
                    new Model(),
                    data[index]
                ));
                const errors = validateSync(validator);

                if (errors[0]) {
                    this.validity = Object.fromEntries(
                        errors.map(({ property, constraints }) => [
                            property,
                            constraints
                        ])
                    );
                    throw InvalidError.from(this.validity);
                }
            }
            return method.apply(this, data);
        };
    };
}
