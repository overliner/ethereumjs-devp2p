/// <reference types="node" />
import { EventEmitter } from 'events';
import _KBucket = require('k-bucket');
import { PeerInfo } from './dpt';
export interface CustomContact extends PeerInfo {
    id: Uint8Array | Buffer;
    vectorClock: number;
}
export declare class KBucket extends EventEmitter {
    _peers: Map<string, PeerInfo>;
    _kbucket: _KBucket;
    constructor(localNodeId: Buffer);
    static getKeys(obj: Buffer | string | PeerInfo): string[];
    add(peer: PeerInfo): void;
    get(obj: Buffer | string | PeerInfo): PeerInfo | null;
    getAll(): Array<PeerInfo>;
    closest(id: string): PeerInfo[];
    remove(obj: Buffer | string | PeerInfo): void;
}
