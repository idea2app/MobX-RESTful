import 'dotenv/config';

import { service } from '../source/service';

export { service } from '../source/service';

service.baseURI = 'https://api.github.com/';

const { GITHUB_PAT } = process.env;

service.use(({ request }, next) => {
    (request.headers ||= {})['Authorization'] = `Bearer ${GITHUB_PAT}`;

    return next();
});
