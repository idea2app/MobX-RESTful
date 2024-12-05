import 'core-js/stable/structured-clone';
import 'fake-indexeddb/auto';

import { get } from 'idb-keyval';
import { observable } from 'mobx';
import { sleep } from 'web-utility';

import {
    BaseModel,
    destroy,
    ListModel,
    persist,
    persistList,
    restore
} from '../source';
import { client } from './service';

describe('Persist base', () => {
    class SimpleModel extends BaseModel {
        restored = restore(this, 'Test');

        @persist()
        @observable
        accessor name: string | undefined;
    }
    const simpleStore = new SimpleModel();

    it('should save a property to IndexedDB', async () => {
        await simpleStore.restored;

        simpleStore.name = 'Test';
        await sleep(1);
        expect(await get('Test-name')).toBe('Test');

        simpleStore.name = 'Example';
        await sleep();
        expect(await get('Test-name')).toBe('Example');
    });

    it('should restore a property from IndexedDB', async () => {
        const newSimpleStore = new SimpleModel();

        expect(newSimpleStore.name).toBeUndefined();

        await newSimpleStore.restored;

        expect(newSimpleStore.name).toBe('Example');
    });

    it('should destroy IndexedDB values & MobX reactions of Persist properties', async () => {
        await destroy(simpleStore, 'Test');

        expect(await get('Test-name')).toBeUndefined();

        simpleStore.name = 'Test';

        expect(await get('Test-name')).toBeUndefined();
    });
});

describe('Persist list', () => {
    interface Test {
        id: number;
    }
    const pageData = Array.from({ length: 10 }, (_, i) => ({ id: ++i }));

    @persistList({ storeKey: 'TestList' })
    class TestListModel extends ListModel<Test> {
        baseURI = 'test';
        client = client;
        declare restored?: Promise<void>;

        async loadPage() {
            return { pageData, totalCount: 10 };
        }
    }
    const testListStore = new TestListModel();

    it('should save a list to IndexedDB', async () => {
        await testListStore.restored;

        expect(testListStore.allItems).toEqual([]);

        await testListStore.getList();

        const pageList = await get<Test[]>('TestList-pageList');

        expect(pageList).toEqual([pageData]);
        expect(testListStore.noMore).toBeTruthy();
    });

    it('should restore a list from IndexedDB', async () => {
        const newTestListStore = new TestListModel();

        expect(newTestListStore.allItems).toEqual([]);

        await newTestListStore.restored;

        expect(newTestListStore.allItems).toEqual(pageData);
        expect(newTestListStore.noMore).toBeTruthy();
    });
});
