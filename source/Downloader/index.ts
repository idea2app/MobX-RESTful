import { get, getMany, set } from 'idb-keyval';
import { computed, observable } from 'mobx';

import { HTTPDownloadTask } from './HTTP';
import type { DownloadTask, DownloadTaskClass } from './Task';

export class Downloader {
    static protocolMap: Record<string, DownloadTaskClass> = {
        http: HTTPDownloadTask,
        https: HTTPDownloadTask
    };

    static createTask(name: string, path: string) {
        const [protocol] = path.split(':');
        const ProtocolTask = Downloader.protocolMap[protocol];

        if (!ProtocolTask)
            throw new URIError(
                `Protocol "${protocol} has not been registered"`
            );

        return ProtocolTask.create(name, path);
    }

    constructor() {
        this.restoreTasks();
    }

    @observable
    accessor tasks: DownloadTask[] = [];

    @computed
    get unfinishedCount() {
        return this.tasks.filter(({ percent }) => percent < 100).length;
    }

    @computed
    get executingCount() {
        return this.tasks.filter(({ executing }) => executing).length;
    }

    saveTasks() {
        return set(
            'downloader-tasks',
            this.tasks.map(({ id }) => id)
        );
    }

    async restoreTasks() {
        const list = await get<string[]>('downloader-tasks');

        if (!list) return;

        const dataList = (await getMany<DownloadTask>(list)).filter(Boolean);

        this.tasks = await Promise.all(
            dataList.map(({ name, path }) => Downloader.createTask(name, path))
        );
        return this.tasks;
    }

    async createTask(name: string, path: string) {
        const task = await Downloader.createTask(name, path);

        if (!this.tasks.find(task => task.path === path)) {
            this.tasks.push(task);

            await this.saveTasks();
        }
        return task;
    }

    async destroyTask(name: string) {
        const index = this.tasks.findIndex(({ name: N }) => N === name);

        if (index < 0) throw new ReferenceError(`${name} isn't found`);

        const [task] = this.tasks.splice(index, 1);

        await task.destroy();

        await this.saveTasks();
    }
}
