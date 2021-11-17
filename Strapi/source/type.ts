export interface APIError {
    statusCode: number;
    error: string;
    message: string;
    data?: { messages: Record<string, string>[] }[];
}

export interface Base {
    id: number | string;
    created_at: string;
    updated_at: string;
    published_at: string;
}

export interface User extends Base {
    username: string;
    email: string;
    provider?: string;
    confirmed: boolean;
    blocked: boolean;
    role: any;
}

export interface Media extends Base {
    name: string;
    alternativeText: string;
    caption: string;
    width: number;
    height: number;
    formats: [];
    hash: string;
    ext: string;
    mime: string;
    size: number;
    url: string;
    previewUrl: string;
    provider: string;
    provider_metadata: [];
    related: string;
}
