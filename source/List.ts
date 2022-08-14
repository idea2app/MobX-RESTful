import { observable, computed, action, reaction } from 'mobx';

import { DataObject, NewData, splitList, toggle } from './utility';
import { BaseListModel } from './Base';

export interface PageData<D extends DataObject> {
    pageData: D[];
    totalCount?: number;
}

export abstract class ListModel<
    D extends DataObject,
    F extends NewData<D> = NewData<D>
> extends BaseListModel<D> {
    @observable
    pageIndex = 0;

    @observable
    pageSize = 10;

    @observable
    filter: F = {} as F;

    @observable
    noMore = false;

    @observable
    totalCount = 0;

    @observable
    pageList: D[][] = [];

    @computed
    get currentPage() {
        return this.pageList[this.pageIndex - 1] || [];
    }

    @computed
    get allItems() {
        return this.pageList
            .map(page =>
                page?.[0] ? page : new Array(this.pageSize).fill(undefined)
            )
            .flat();
    }

    constructor() {
        super();

        reaction(
            () => this.pageSize,
            pageSize => (this.pageList = splitList(this.allItems, pageSize))
        );
    }

    @action
    clear() {
        this.pageIndex = this.totalCount = 0;
        this.pageSize = 10;
        this.filter = {} as F;
        this.noMore = false;
        this.pageList = [];

        return super.clear();
    }

    @action
    turnTo(pageIndex: number, pageSize = this.pageSize) {
        this.pageIndex = pageIndex;
        this.pageSize = pageSize;

        return this;
    }

    protected abstract loadPage(
        pageIndex: number,
        pageSize: number,
        filter: F
    ): Promise<PageData<D>>;

    protected async loadNewPage(
        pageIndex: number,
        pageSize: number,
        filter: F
    ) {
        const { pageData, totalCount } = await this.loadPage(
            pageIndex,
            pageSize,
            filter
        );
        const list = [...this.pageList];
        list[pageIndex - 1] = pageData;
        this.pageList = list;

        this.totalCount =
            totalCount ?? (pageIndex - 1) * pageSize + pageData.length;

        return { pageData, totalCount };
    }

    protected flushPage(pageIndex: number, pageSize: number, pageData: D[]) {
        this.turnTo(pageIndex, pageSize);

        this.noMore = pageData.length < pageSize;

        return pageData;
    }

    @toggle('downloading')
    @action
    async getList(
        filter: F = this.filter,
        pageIndex = this.pageIndex + 1,
        pageSize = this.pageSize
    ) {
        const { pageData } = await this.loadNewPage(
            pageIndex,
            pageSize,
            filter
        );
        return this.flushPage(pageIndex, pageSize, pageData);
    }
}

export abstract class CacheListModel<
    D extends DataObject,
    F extends NewData<D> = NewData<D>
> extends ListModel<D, F> {
    protected pendingList: ReturnType<ListModel<D, F>['loadPage']>[] = [];

    clear() {
        this.pendingList = [];

        return this;
    }

    @toggle('downloading')
    @action
    async getList(
        filter: F = this.filter,
        pageIndex = this.pageIndex + 1,
        pageSize = this.pageSize
    ): Promise<D[]> {
        const currentIndex = pageIndex - 1;

        if (this.pendingList[currentIndex]) {
            const { pageData } = await this.pendingList[currentIndex];

            return this.flushPage(pageIndex, pageSize, pageData);
        }

        if (this.pageList[currentIndex]) {
            this.turnTo(pageIndex, pageSize);
        } else {
            var list = await super.getList(filter, pageIndex, pageSize);
        }

        const nextIndex = pageIndex + 1;

        this.pendingList[nextIndex] = this.loadNewPage(
            nextIndex,
            pageSize,
            filter
        ).then(data => {
            this.pendingList[nextIndex] = undefined;
            return data;
        });
        return list;
    }
}
