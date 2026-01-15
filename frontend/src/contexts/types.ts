export interface User extends Record<string, unknown> {
    id: string;
    email: string;
    verified: boolean;
    username?: string;
    name?: string;
    avatar?: string;
    created?: string;
    updated?: string;
    collectionId?: string;
    collectionName?: string;
    passwordHash?: string;
}