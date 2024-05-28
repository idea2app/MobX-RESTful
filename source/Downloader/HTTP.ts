import { HTTPClient, type DownloadOptions } from 'koajax';
import type { FileSystemFileHandle } from 'native-file-system-adapter';

import { restore } from '../utility';
import { DownloadTask } from './Task';

export class HTTPDownloadTask extends DownloadTask {
    client: DownloadTask['client'] = new HTTPClient({
        responseType: 'arraybuffer'
    });

    constructor(path: string, name?: string) {
        super(name, path);

        this.id = `http-download-task-${name}`;

        restore(this, this.id);
    }

    async *loadStream(options?: DownloadOptions) {
        const { path } = this;
        const suggestedName = DownloadTask.nameOf(path);

        try {
            this.fsHandle ||= await (
                await import('native-file-system-adapter')
            ).showSaveFilePicker({ suggestedName });
        } catch {
            return;
        }
        const writer = await (
                this.fsHandle as FileSystemFileHandle
            ).createWritable({
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
