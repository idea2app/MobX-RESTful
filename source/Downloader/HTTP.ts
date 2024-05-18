import { HTTPClient, type DownloadOptions } from 'koajax';
import {
    FileSystemFileHandle,
    showSaveFilePicker
} from 'native-file-system-adapter';

import { DownloadTask } from './Task';

export class HTTPDownloadTask extends DownloadTask {
    declare fsHandle?: FileSystemFileHandle;

    client = new HTTPClient({ responseType: 'arraybuffer' });

    constructor(
        public name: string,
        public path: string
    ) {
        super(name, path);

        this.id = `http-download-task-${name}`;
    }

    async *loadStream(options?: DownloadOptions) {
        const { path } = this;
        const suggestedName = new URL(path).pathname
            .split('/')
            .filter(Boolean)
            .at(-1);

        try {
            this.fsHandle ||= await showSaveFilePicker({
                suggestedName
            });
        } catch {
            return;
        }
        const writer = await this.fsHandle.createWritable({
                keepExistingData: true
            }),
            stream = this.client.download(path, {
                range: [this.loaded],
                ...options
            });

        try {
            this.executing = true;

            for await (const chunk of stream) {
                await writer.write({
                    type: 'write',
                    position: this.loaded,
                    data: chunk.buffer
                });

                yield this.saveMeta(chunk);

                if (!this.executing) break;
            }
        } finally {
            await writer.close();

            this.executing = false;
        }
    }
}
