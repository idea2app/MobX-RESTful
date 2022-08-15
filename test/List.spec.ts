import { isEmpty, buildURLData, mergeStream } from 'web-utility';

import { ListModel, StreamListModel } from '../source/List';
import { client } from './service';

describe('List model', () => {
    describe('Single List model', () => {
        type Repository = Record<'full_name' | 'html_url', string>;

        class RepositoryModel extends ListModel<Repository> {
            client = client;
            baseURI = 'orgs/idea2app/repos';

            async loadPage(page: number, per_page: number) {
                const { body } = await this.client.get<Repository[]>(
                    `${this.baseURI}?${buildURLData({ page, per_page })}`
                );
                return { pageData: body };
            }
        }
        const store = new RepositoryModel();

        it('should get a List data of the First page', async () => {
            expect(store.pageIndex).toBe(0);

            const list = await store.getList();

            expect(store.pageIndex).toBe(1);
            expect(store.pageSize).toBe(10);
            expect(store.totalCount).toBe(10);
            expect(list).toHaveLength(10);

            expect(store.pageList).toEqual([list]);
            expect(store.currentPage).toEqual(list);
            expect(store.allItems).toEqual(list);
        });

        it('should get a List data of the Second page', async () => {
            expect(store.pageIndex).toBe(1);

            const list = await store.getList();

            expect(store.pageIndex).toBe(2);
            expect(store.pageSize).toBe(10);
            expect(store.totalCount).toBe(20);
            expect(list).toHaveLength(10);

            expect(store.pageList).toHaveLength(2);
            expect(store.pageList[1]).toEqual(list);
            expect(store.currentPage).toEqual(list);
            expect(store.allItems).toHaveLength(20);
            expect(store.allItems.slice(10)).toEqual(list);
        });

        it('should turn to a Previous Page', () => {
            store.turnTo(1);

            expect(store.pageIndex).toBe(1);
            expect(store.pageSize).toBe(10);
            expect(store.currentPage).toEqual(store.pageList[0]);
        });

        it('should regroup Paginated lists', () => {
            store.turnTo(2, 5);

            expect(store.pageSize).toBe(5);
            expect(store.pageList).toHaveLength(4);
            expect(store.currentPage).toEqual(store.allItems.slice(5, 10));
        });

        it('should clear states', () => {
            const {
                pageIndex,
                pageSize,
                filter,
                totalCount,
                noMore,
                pageList
            } = store.clear();

            expect([pageIndex, pageSize, totalCount, noMore]).toEqual([
                0,
                10,
                0,
                false
            ]);
            expect([filter, pageList].map(isEmpty)).toEqual([true, true]);
        });

        it('should accept going to a Middle Page directly', async () => {
            const list = await store.getList({}, 2);

            expect(list).toEqual(store.currentPage);
            expect(store.totalCount).toBe(20);
            expect(store.allItems).toHaveLength(20);
            expect(isEmpty(store.pageList[0])).toBe(true);
        });
    });

    describe('Multiple List model', () => {
        type User = Record<'name', string>;

        class UserModel extends StreamListModel<User>() {
            client = client;
            baseURI = 'user';

            protected openStream() {
                return mergeStream(
                    async function* () {
                        yield* new Array<User>(3).fill({ name: 'Ukrainian' });
                    },
                    async function* () {
                        yield* new Array<User>(3).fill({ name: 'Russian' });
                    }
                );
            }
        }
        const store = new UserModel();

        it('should load a Page with items in every stream', async () => {
            const list = await store.getList({}, 1, 3);

            expect(list).toEqual([
                { name: 'Ukrainian' },
                { name: 'Russian' },
                { name: 'Ukrainian' }
            ]);
        });

        it('should load all pages before current page', async () => {
            store.clear();

            expect(store.pageList).toHaveLength(0);

            const list = await store.getList({}, 2, 3);

            expect(list).toEqual([
                { name: 'Russian' },
                { name: 'Ukrainian' },
                { name: 'Russian' }
            ]);
            expect(store.allItems).toHaveLength(6);
        });
    });
});
