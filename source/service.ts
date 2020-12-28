import { HTTPClient, HTTPError } from 'koajax';

const { localStorage, location } = self;

var token: string = localStorage.token || '';

export const setToken = (raw: string) => (token = localStorage.token = raw);

export const service = new HTTPClient({
    baseURI:
        location.hostname === 'localhost'
            ? 'http://localhost:1337/'
            : location.origin,
    responseType: 'json'
}).use(({ request }, next) => {
    if (token)
        (request.headers = request.headers || {})['Authorization'] =
            'Bearer ' + token;

    return next();
});

export type APIError = HTTPError<{
    statusCode: number;
    error: string;
    message: string;
    data?: { messages: Record<string, string>[] }[];
}>;

export const github = new HTTPClient({
    baseURI: 'https://api.github.com/',
    responseType: 'json'
});
