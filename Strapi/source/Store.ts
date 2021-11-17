import { buildURLData } from 'web-utility';
import { HTTPMethod, PageFilter, PageData, BaseStore } from 'mobx-rest';

import { APIError, Media } from './type';

export abstract class StrapiStore<
    C,
    P,
    F extends PageFilter<C, P> = PageFilter<C, P>
> extends BaseStore<C, P, F> {
    static setAuthorization(value: string, type = 'Bearer') {
        return (localStorage.Authorization = `${type} ${value}`);
    }

    async request<T = C>(
        method: HTTPMethod,
        path: string,
        body?: any,
        headers?: Record<string, string>
    ): Promise<T> {
        const { Authorization } = localStorage,
            isJSON =
                body != null &&
                Object.getPrototypeOf(body) === Object.prototype;

        if (Authorization) headers = { ...headers, Authorization };
        if (isJSON)
            headers = { ...headers, 'Content-Type': 'application/json' };

        const response = await fetch(path, {
            method,
            headers,
            mode: 'cors',
            body: isJSON ? JSON.stringify(body) : body
        });
        const data = await response.json();

        if (response.status > 299) {
            const { message, data: detail } = data as APIError;
            const text = detail
                ?.map(({ messages }) =>
                    messages.map(message =>
                        Object.entries(message).map(
                            ([key, value]) => `${key}: ${value}`
                        )
                    )
                )
                .flat()
                .join('\n');

            throw new URIError(text || message);
        }

        return data;
    }

    async requestPage(
        path: string,
        filter: F = { pageIndex: this.pageIndex, pageSize: this.pageSize } as F
    ): Promise<PageData<C>> {
        const { pageIndex, pageSize, ...query } = filter;

        const { count, data } = await this.request<{
            count: number;
            data: C[];
        }>(
            'GET',
            `${path}?${buildURLData({
                ...query,
                page: pageIndex,
                size: pageSize
            })}`
        );
        return { pageIndex, pageSize, totalCount: count, list: data };
    }

    async requestUpload(
        model: string,
        id: string,
        key: string,
        files: Blob[],
        module?: string
    ) {
        const body = new FormData();

        body.append('ref', model);
        body.append('refId', id + '');
        body.append('field', key);

        if (module) body.append('source', module);

        for (const file of files) body.append('files', file);

        return this.request<Media>('POST', 'upload', body);
    }
}
