import type { DownloadOptions, TransferProgress } from 'koajax';
import { computed, observable, reaction } from 'mobx';
import type { FileSystemHandle } from 'native-file-system-adapter';
import { ReadableStream } from 'web-streams-polyfill';
import { ByteSize } from 'web-utility';

import { destroy, persist, restore } from '../utility';

export abstract class DownloadTask implements Partial<TransferProgress> {
    @persist()
    @observable
    accessor id = '';

    @persist()
    @observable.shallow
    accessor fsHandle: FileSystemHandle | undefined;

    @persist()
    @observable
    accessor total = 0;

    @persist()
    @observable
    accessor loaded = 0;

    @persist()
    @observable
    accessor percent = 0;

    @observable
    accessor executing = false;

    @persist()
    @observable
    accessor options: DownloadOptions | undefined;

    stream?: ReadableStream<Partial<TransferProgress>>;

    @computed
    get totalSize() {
        return new ByteSize(this.total);
    }

    @computed
    get loadedSize() {
        return new ByteSize(this.loaded);
    }

    constructor(
        public name: string,
        public path: string
    ) {
        restore(this, this.id);
    }

    toJSON() {
        const { id, name, path, fsHandle, total, loaded, percent, options } =
            this;

        return {
            ...{ id, name, path, fsHandle, options },
            ...{ total, loaded, percent }
        };
    }

    saveMeta(data: Partial<TransferProgress> = {}) {
        const { buffer, ...progress } = data;

        Object.assign(this, progress);

        return data;
    }

    abstract loadStream(
        options?: DownloadOptions
    ): AsyncGenerator<Partial<TransferProgress>>;

    async pause() {
        this.executing = false;
    }

    async start(options = this.options) {
        this.options = options;

        const [innerStream, outerStream] = ReadableStream.from<
            Partial<TransferProgress>
        >(this.loadStream(options)).tee();

        (async () => {
            for await (const chunk of innerStream) console.table(chunk);
        })();

        return (this.stream = outerStream);
    }

    async destroy() {
        await this.pause();

        return destroy(this, this.id);
    }

    onFinished(callback: (task: DownloadTask) => any) {
        return reaction(
            () => this.percent === 100,
            () => callback(this)
        );
    }
}
