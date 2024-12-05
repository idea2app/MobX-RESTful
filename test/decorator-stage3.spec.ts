import 'core-js/stable/structured-clone';
import 'fake-indexeddb/auto';

import { Blob } from 'buffer';
import { get } from 'idb-keyval';
import { observable } from 'mobx';
import { sleep } from 'web-utility';

import {
    BaseModel,
    destroy,
    ListModel,
    persist,
    PersistBox,
    persistList,
    restore
} from '../source';
import { client } from './service';

describe('Persist base', () => {
    class TestModel extends BaseModel {
        @persist()
        @observable
        accessor name: string | undefined;

        @persist({
            set: text => new Blob([text]),
            get: blob => blob.text()
        })
        @observable
        accessor file = '';

        @persist({ expireIn: 1000 })
        @observable
        accessor token = '';

        restored = restore(this, 'Test');
    }
    const testStore = new TestModel();

    it('should save a property to IndexedDB', async () => {
        await testStore.restored;

        testStore.name = 'Test';
        await sleep();
        expect(await get('Test-name')).toEqual({
            expireAt: Infinity,
            value: 'Test'
        });
        testStore.name = 'Example';
        await sleep();
        expect(await get('Test-name')).toEqual({
            expireAt: Infinity,
            value: 'Example'
        });
    });

    it('should restore a property from IndexedDB', async () => {
        const newTestStore = new TestModel();

        expect(newTestStore.name).toBeUndefined();

        await newTestStore.restored;

        expect(newTestStore.name).toBe('Example');
    });

    it('should write/read a serialized property to/from IndexedDB', async () => {
        testStore.file = 'Test';

        await sleep();

        const { value } = await get<PersistBox<string, Blob>>('Test-file');

        expect(value).toBeInstanceOf(Blob);
        expect(await (value as Blob).text()).toBe('Test');

        const newTestStore = new TestModel();

        await newTestStore.restored;

        expect(newTestStore.file).toBe('Test');
    });

    it('should delete an expired property from IndexedDB', async () => {
        testStore.token = 'xyz';

        await sleep(1);

        const { value } = await get<PersistBox>('Test-token');

        expect(value).toBe('xyz');

        const newTestStore = new TestModel();

        await newTestStore.restored;

        expect(newTestStore.token).toBe('');
        expect(await get('Test-token')).toBeUndefined();
    });

    it('should destroy IndexedDB values & MobX reactions of Persist properties', async () => {
        await destroy(testStore, 'Test');

        expect(await get('Test-name')).toBeUndefined();

        testStore.name = 'Test';

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

        expect(pageList).toEqual({
            expireAt: Infinity,
            value: [pageData]
        });
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
