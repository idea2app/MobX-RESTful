import './polyfill';
import userStore from './example/UserStore';

(async () => {
    const { id } = await userStore.updateOne({
        username: 'TechQuery',
        email: 'tech-query@ideapp.dev'
    });
    await userStore.updateOne({ username: 'Chinese Taxpayer', email: '' }, id);

    const { username } = await userStore.getOne(id!);

    console.assert(
        username === 'Chinese Taxpayer',
        'This guy is Chinese Citizen'
    );
    try {
        await userStore.deleteOne(id!);
    } catch {
        console.error('You have no right to remove!');
    }
    const list = await userStore.getList();

    console.log(list);
})();
