import type {
    Context,
    DownloadOptions,
    HTTPClient,
    TransferProgress
} from 'koajax';
import { computed, observable } from 'mobx';
import type { FileSystemHandle } from 'native-file-system-adapter';
import type { ReadableStream } from 'web-streams-polyfill';
import { ByteSize } from 'web-utility';

import { destroy, persist } from '../utility';

export abstract class DownloadTask implements Partial<TransferProgress> {
    abstract client: Pick<HTTPClient<Context>, 'download'>;

    @persist()
    @observable
    accessor id = '';

    @persist()
    @observable
    accessor name = '';

    @persist()
    @observable
    accessor path = '';

    @persist()
    @observable.ref
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

    static nameOf(URI: string) {
        return decodeURI(
            new URL(URI).pathname.split('/').filter(Boolean).at(-1)
        );
    }

    constructor(path: string, name = DownloadTask.nameOf(path)) {
        this.path = path;
        this.name = name;
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

    async start(options = this.options) {
        this.options = options;

        const started = Promise.withResolvers<void>();

        const [innerStream, outerStream] = (
            await import('web-streams-polyfill')
        ).ReadableStream.from<Partial<TransferProgress>>(
            this.loadStream(options)
        ).tee();

        (async () => {
            try {
                for await (const chunk of innerStream) {
                    started.resolve();
                    console.table(chunk);
                }
            } catch (error) {
                started.reject(error);
            }
        })();

        await started.promise;

        return (this.stream = outerStream);
    }

    async pause() {
        this.executing = false;
    }

    async destroy() {
        await this.pause();

        return destroy(this, this.id);
    }
}
