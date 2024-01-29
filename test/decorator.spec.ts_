import { UserStore } from './example/UserStore';

describe('Validation decorators', () => {
    const store = new UserStore();

    it('should throw an error & set reasons after validating Updating Input failed', async () => {
        try {
            // @ts-ignore
            await store.updateOne({ email: 'example' });
        } catch {
            return expect(store.validity).toEqual({
                username: { isString: 'username must be a string' },
                email: { isEmail: 'email must be an email' }
            });
        }
        throw new Error('This case must throw');
    });

    it('should not hold latest Validation state', async () => {
        store.clear();

        await store.updateOne({
            username: 'test',
            email: 'example@sample.com'
        });
        expect(store.validity).toEqual({});
    });

    it('should not validate Input while the parameter is optional & empty', async () => {
        await store.getList();

        expect(store.validity).toEqual({});
    });
});
