import { HTTPClient } from 'koajax';

export const createClient = (apiHost: string, apikey: string) =>
    new HTTPClient({ baseURI: `${apiHost}/rest/v1/`, responseType: 'json' }).use(
        ({ request }, next) => {
            request.headers = { apikey, Authorization: `Bearer ${apikey}`, ...request.headers };

            return next();
        }
    );
