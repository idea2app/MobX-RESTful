import { DataObject, Filter, ListModel, NewData, IDType, toggle } from 'mobx-restful';
import { buildURLData } from 'web-utility';

export abstract class SupabaseListModel<
    D extends DataObject,
    F extends Filter<D> = Filter<D>
> extends ListModel<D, F> {
    @toggle('uploading')
    async updateOne(data: Partial<NewData<D>>, id?: IDType) {
        const header = { Prefer: 'return=representation' };
        const { body } = await (id
            ? this.client.patch<D>(`${this.baseURI}?id=eq.${id}`, data, header)
            : this.client.post<D>(this.baseURI, data, header));

        return (this.currentOne = body);
    }

    /**
     * @protected
     */
    async loadPage(pageIndex: number, pageSize: number, filter: F) {
        const start = (pageIndex - 1) * pageSize,
            end = pageIndex * pageSize - 1;

        const query = Object.fromEntries(
            Object.entries(filter).map(([key, value]) =>
                Array.isArray(value) ? [key, `cs.{${value}}`] : [key, `eq.${value}`]
            )
        );
        const { headers, body } = await this.client.get<D[]>(
            `${this.baseURI}?${buildURLData({ ...query, select: '*' })}`,
            { Range: `${start}-${end}`, Prefer: 'count=exact' }
        );
        const [, count] = (headers['Content-Range'] as string).split('/');

        return { totalCount: +count, pageData: body };
    }
}
