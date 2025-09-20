import { action, computed, observable, toJS } from 'mobx';
import { AbstractClass, IndexKey, TypeKeys, countBy, splitArray } from 'web-utility';

import { BaseListModel } from './Base';
import { DataObject, IDType, NewData, toggle } from './utility';

export type Filter<T extends DataObject> = Partial<NewData<T>>;

export interface PageData<D extends DataObject> {
    pageData: D[];
    totalCount?: number;
}

export type Statistic<D extends DataObject> = Partial<
    Record<TypeKeys<D, IndexKey>, Record<string, number>>
>;

export abstract class ListModel<
    D extends DataObject,
    F extends Filter<D> = Filter<D>
> extends BaseListModel<D> {
    @observable
    accessor pageIndex = 0;

    @observable
    accessor pageSize = 10;

    @observable
    accessor filter = {} as F;

    @observable
    accessor totalCount: number | undefined;

    @observable
    accessor pageList: D[][] = [];

    @computed
    get currentPage() {
        return this.pageList[this.pageIndex - 1] || [];
    }

    @computed
    get pageCount() {
        return Math.ceil(this.totalCount / this.pageSize) || this.pageList.length;
    }

    @computed
    get allItems() {
        const pageList = toJS(this.pageList),
            { pageSize, totalCount } = this;

        const index = [...pageList].reverse().findIndex(item => item?.[0] != null);

        return Array.from<D[], D[]>(pageList.slice(0, -index || Infinity), page =>
            page?.[0] ? page : new Array(pageSize).fill({})
        )
            .flat()
            .slice(0, totalCount || 0);
    }

    @computed
    get noMore() {
        return this.pageIndex * this.pageSize >= this.totalCount;
    }

    @observable
    accessor statistic: Statistic<D> = {};

    @action
    clearList() {
        this.pageIndex = 0;
        this.pageSize = 10;
        this.filter = {} as F;
        this.pageList = [];
        this.totalCount = undefined;
    }

    clear() {
        super.clear();
        this.clearList();
    }

    @action
    restoreList({
        pageIndex = this.pageIndex + 1,
        pageSize = this.pageSize,
        allItems = this.allItems,
        totalCount = Infinity
    }: Partial<Pick<ListModel<D>, 'pageIndex' | 'pageSize' | 'allItems' | 'totalCount'>> = {}) {
        if (!allItems.length) return;

        this.pageList = splitArray(allItems, pageSize);
        this.pageIndex = pageIndex;
        this.pageSize = pageSize;
        this.totalCount = totalCount;
    }

    @action
    turnTo(pageIndex: number, pageSize = this.pageSize): ListModel<D, F> {
        this.pageIndex = pageIndex;

        if (this.pageSize !== pageSize)
            this.pageList = splitArray(this.allItems, (this.pageSize = pageSize));

        return this;
    }

    /**
     * @protected
     */
    abstract loadPage(pageIndex: number, pageSize: number, filter: F): Promise<PageData<D>>;

    /**
     * @protected
     */
    async loadNewPage(pageIndex: number, pageSize: number, filter: F) {
        const { pageData, totalCount } = await this.loadPage(pageIndex, pageSize, filter);

        this.pageSize = pageSize;

        const list = [...this.pageList];
        list[pageIndex - 1] = pageData;
        this.pageList = list;

        this.totalCount =
            totalCount != null
                ? isNaN(totalCount) || totalCount < 0
                    ? Infinity
                    : totalCount
                : Infinity;

        return { pageData, totalCount };
    }

    // @action  // disabled for @override bug of MobX 6
    @toggle('downloading')
    async getList(
        filter: F = this.filter,
        pageIndex = this.pageIndex + 1,
        pageSize = this.pageSize
    ) {
        const { pageData } = await this.loadNewPage(pageIndex, pageSize, filter);

        this.filter = filter;

        this.turnTo(pageIndex, pageSize);

        return pageData;
    }

    refreshList() {
        const { filter, pageSize } = this;

        this.clearList();

        return this.getList(filter, 1, pageSize);
    }

    async *getAllInStream(filter: F = this.filter, pageSize = this.pageSize) {
        this.pageIndex = 0;

        while (!this.noMore) yield* await this.getList(filter, undefined, pageSize);
    }

    [Symbol.asyncIterator] = this.getAllInStream;

    getAll(filter: F = this.filter, pageSize = this.pageSize) {
        return Array.fromAsync(this.getAllInStream(filter, pageSize));
    }

    async countAll(
        keys: TypeKeys<D, IndexKey>[],
        filter: F = this.filter,
        pageSize = this.pageSize
    ) {
        const allItems = await this.getAll(filter, pageSize);

        const statistic = Object.fromEntries(
            keys.map(key => [key, countBy(allItems, key)])
        ) as Statistic<D>;

        return (this.statistic = statistic);
    }

    indexOf(id: IDType) {
        const { indexKey, allItems } = this;

        return allItems.findIndex(({ [indexKey]: ID }) => ID === id);
    }

    changeOne(data: Partial<D>, id: IDType, patch = false) {
        const { pageIndex, allItems, totalCount } = this,
            index = this.indexOf(id);

        if (index > -1)
            this.restoreList({
                pageIndex,
                allItems: [
                    ...allItems.slice(0, index),
                    patch ? { ...allItems[index], ...data } : (data as D),
                    ...allItems.slice(index + 1)
                ],
                totalCount
            });
    }

    async updateOne(data: Partial<NewData<D>>, id?: IDType) {
        await super.updateOne(data, id);

        if (id) this.changeOne(this.currentOne, id);

        return this.currentOne;
    }

    async removeOne(id: IDType) {
        const { filter, pageIndex, allItems } = this,
            index = this.indexOf(id);
        const { pageData } = await this.loadPage(allItems.length + 1, 1, filter);

        return this.restoreList({
            pageIndex,
            allItems: [...allItems.slice(0, index), ...allItems.slice(index + 1), ...pageData],
            totalCount: this.totalCount--
        });
    }

    @toggle('uploading')
    async deleteOne(id: IDType) {
        await super.deleteOne(id);
        await this.removeOne(id);
    }
}

export function Buffer<
    D extends DataObject,
    F extends Filter<D> = Filter<D>,
    M extends AbstractClass<ListModel<D, F>> = AbstractClass<ListModel<D, F>>
>(Super: M) {
    abstract class BufferListMixin extends Super {
        pendingList: ReturnType<ListModel<D, F>['loadPage']>[] = [];

        clearList() {
            super.clearList();

            this.pendingList = [];
        }

        clear() {
            super.clear();
            this.clearList();
        }

        @action
        @toggle('downloading')
        async getList(
            filter: F = this.filter,
            pageIndex = this.pageIndex + 1,
            pageSize = this.pageSize
        ): Promise<D[]> {
            const currentIndex = pageIndex - 1;

            if (this.pendingList[currentIndex]) {
                const { pageData } = await this.pendingList[currentIndex];

                this.turnTo(pageIndex, pageSize);

                return pageData;
            }

            if (this.pageList[currentIndex]) {
                this.turnTo(pageIndex, pageSize);
            } else {
                var list = await super.getList(filter, pageIndex, pageSize);
            }

            const nextIndex = pageIndex + 1;

            this.pendingList[nextIndex] = this.loadNewPage(nextIndex, pageSize, filter).then(
                data => {
                    this.pendingList[nextIndex] = undefined;
                    return data;
                }
            );
            return list;
        }
    }
    return BufferListMixin;
}

export function Stream<
    D extends DataObject,
    F extends Filter<D> = Filter<D>,
    M extends AbstractClass<ListModel<D, F>> = AbstractClass<ListModel<D, F>>
>(Super: M) {
    abstract class StreamListMixin extends Super {
        stream?: AsyncGenerator<D, void, any>;
        abstract openStream(filter: F): AsyncGenerator<D, void, any>;

        clearList() {
            super.clearList();

            this.stream = undefined;
        }

        clear() {
            super.clear();
            this.clearList();
        }

        @toggle('downloading')
        async restoreList({
            filter = this.filter,
            pageIndex = this.pageIndex + 1,
            pageSize = this.pageSize,
            allItems = this.allItems,
            totalCount = Infinity
        }: Partial<
            Pick<ListModel<D>, 'filter' | 'pageIndex' | 'pageSize' | 'allItems' | 'totalCount'>
        > = {}) {
            super.restoreList({ pageIndex, pageSize, allItems, totalCount });

            if (allItems.length) await this.loadStream(filter as F, allItems.length);
        }

        /**
         * @protected
         */
        async loadStream(filter: F, newCount: number) {
            const newList: D[] = [];

            const stream = (this.stream ||= this.openStream(filter));

            for (let i = 0; i < newCount; i++) {
                const { done, value } = await stream.next();

                if (done) break;

                newList.push(value as D);
            }
            return newList;
        }

        /**
         * @protected
         */
        async loadPage(pageIndex: number, pageSize: number, filter: F) {
            const { totalCount, allItems } = this,
                requiredCount = pageIndex * pageSize;
            const newCount =
                (totalCount ? Math.min(totalCount, requiredCount) : requiredCount) -
                allItems.length;
            const newList = await this.loadStream(filter, newCount);

            this.pageList = splitArray([...this.allItems, ...newList], pageSize);

            return {
                pageData: this.pageList[pageIndex - 1] || [],
                totalCount: this.totalCount
            };
        }
    }
    return StreamListMixin;
}
