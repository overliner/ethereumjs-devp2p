/// <reference types="node" />
import { PeerInfo } from './dpt';
export declare class BanList {
    private lru;
    constructor();
    add(obj: string | Buffer | PeerInfo, maxAge?: number): void;
    has(obj: string | Buffer | PeerInfo): boolean;
}
