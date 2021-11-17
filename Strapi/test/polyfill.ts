// @ts-ignore
globalThis.localStorage = {};
// @ts-ignore
globalThis.fetch = async (...data: any[]) => ({
    json: async (): Promise<any> => ({})
});
