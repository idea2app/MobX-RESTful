import 'reflect-metadata';
import type { Constructor, TypeKeys } from 'web-utility';
import { validate } from 'class-validator';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HTTPAuthorizationSchema =
    | 'Basic'
    | 'Bearer'
    | 'Digest'
    | 'HOBA'
    | 'Mutual'
    | 'Negotiate'
    | 'OAuth'
    | 'SCRAM-SHA-1'
    | 'SCRAM-SHA-256'
    | 'vapid';

export type IDType = number | string;

export type NewData<C, P> = Partial<
    Omit<C, TypeKeys<C, P> | TypeKeys<C, P[]>> & {
        [K in TypeKeys<C, P>]: IDType;
    } & {
        [K in TypeKeys<C, P[]>]: IDType[];
    }
>;

export function Body(): ParameterDecorator {
    return (target: any, key, index) =>
        Reflect.defineMetadata(
            `mobx-rest-body-${key as string}`,
            index,
            target
        );
}

export function checkInput() {
    return (target: any, key: string, meta: PropertyDescriptor) => {
        const index = Reflect.getMetadata(`mobx-rest-body-${key}`, target);

        const { [index]: Model } = Reflect.getMetadata(
                'design:paramtypes',
                target,
                key
            ) as Constructor<any>[],
            method = meta.value as (...data: any[]) => Promise<any>;

        meta.value = async function (...data: any[]) {
            if (Model) {
                const validator = (data[index] = Object.assign(
                    new Model(),
                    data[index]
                ));
                const [error] = await validate(validator);

                if (error)
                    throw new Error(
                        error.constraints && Object.values(error.constraints)[0]
                    );
            }
            return method.apply(this, data);
        };
    };
}
