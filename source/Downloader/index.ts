import { computed, observable } from 'mobx';
import { Constructor } from 'web-utility';

import { persist, restore } from '../utility';
import { HTTPDownloadTask } from './HTTP';
import { DownloadTask } from './Task';

export * from './HTTP';
export * from './Task';

export class Downloader {
    static protocolMap: Record<string, Constructor<DownloadTask>> = {
        http: HTTPDownloadTask,
        https: HTTPDownloadTask
    };

    static createTask(path: string, name?: string) {
        const [protocol] = path.split(':');
        const ProtocolTask = Downloader.protocolMap[protocol];

        if (!ProtocolTask)
            throw new URIError(
                `Protocol "${protocol} has not been registered"`
            );
        return new ProtocolTask(path, name);
    }

    constructor() {
        restore(this, 'downloader');
    }

    @persist({
        set: tasks => tasks.map(({ name, path }) => ({ name, path })),
        get: list =>
            list?.map(({ name, path }) => Downloader.createTask(path, name))
    })
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

    createTask(path: string, name?: string) {
        const { tasks } = this,
            task = Downloader.createTask(path, name);

        if (!tasks.find(task => task.path === path))
            this.tasks = [...tasks, task];

        return task;
    }

    async destroyTask(name: string) {
        const { tasks } = this;
        const index = tasks.findIndex(({ name: N }) => N === name);

        if (index < 0) throw new ReferenceError(`${name} isn't found`);

        await tasks[index].destroy();

        this.tasks = [...tasks.slice(0, index), ...tasks.slice(index + 1)];
    }
}
