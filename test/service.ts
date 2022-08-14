import 'dotenv/config';
import { HTTPClient } from 'koajax/source';

export const client = new HTTPClient({
    baseURI: 'https://api.github.com/',
    responseType: 'json'
});

const { GITHUB_PAT } = process.env;

client.use(({ request }, next) => {
    (request.headers ||= {})['Authorization'] = `Bearer ${GITHUB_PAT}`;

    return next();
});
