import { ReadableStream } from 'web-streams-polyfill';

Reflect.set(globalThis, 'ReadableStream', ReadableStream);

import 'dotenv/config';
import { HTTPClient } from 'koajax';
import { configure } from 'mobx';

configure({ enforceActions: 'never' });

export const client = new HTTPClient({
    baseURI: 'https://api.github.com/',
    responseType: 'json'
});

const { GITHUB_PAT } = process.env;

client.use(({ request }, next) => {
    (request.headers ||= {})['Authorization'] = `Bearer ${GITHUB_PAT}`;

    return next();
});
