import { sleep } from 'web-utility';

import { toggle } from '../source/utility';
import { BaseModel, BaseListModel } from '../source/Base';
import { client } from './service';

describe('Base model', () => {
    it('should toggle Numeric fields with Async method called', async () => {
        class SimpleModel extends BaseModel {
            @toggle('downloading')
            async getFirst() {
                await sleep(0.25);
            }

            @toggle('downloading')
            async getSecond() {
                await sleep(0.5);
            }
        }
        const store = new SimpleModel();

        expect(store.downloading).toBe(0);

        const resultOne = store.getFirst();

        expect(store.downloading).toBe(1);

        const resultTwo = store.getSecond();

        expect(store.downloading).toBe(2);

        await resultOne;

        expect(store.downloading).toBe(1);

        await resultTwo;

        expect(store.downloading).toBe(0);
    });

    it('should get an Item Detail data for a RESTful API', async () => {
        class SimpleListModel extends BaseListModel<{
            full_name: string;
            private: boolean;
        }> {
            client = client;
            baseURI = 'repos';
        }
        const store = new SimpleListModel();

        const detail = await store.getOne('idea2app/MobX-RESTful');

        expect(detail).toEqual(store.currentOne);

        const { full_name, private: visibility } = detail;

        expect({ full_name, visibility }).toEqual({
            full_name: 'idea2app/MobX-RESTful',
            visibility: false
        });
    });
});
