/// <reference types="node" />
export declare class MAC {
    _hash: any;
    _secret: Buffer;
    constructor(secret: Buffer);
    update(data: Buffer | string): void;
    updateHeader(data: Buffer | string): void;
    updateBody(data: Buffer | string): void;
    digest(): any;
}
