/// <reference types="node" />
import { EventEmitter } from 'events';
import LRUCache = require('lru-cache');
import { DPT, PeerInfo } from './dpt';
import { Socket as DgramSocket, RemoteInfo } from 'dgram';
export interface DPTServerOptions {
    /**
     * Timeout for peer requests
     *
     * Default: 10s
     */
    timeout?: number;
    /**
     * Network info to send a long a request
     *
     * Default: 0.0.0.0, no UDP or TCP port provided
     */
    endpoint?: PeerInfo;
    /**
     * Function for socket creation
     *
     * Default: dgram-created socket
     */
    createSocket?: Function;
}
export declare class Server extends EventEmitter {
    _dpt: DPT;
    _privateKey: Buffer;
    _timeout: number;
    _endpoint: PeerInfo;
    _requests: Map<string, any>;
    _parityRequestMap: Map<string, string>;
    _requestsCache: LRUCache<string, Promise<any>>;
    _socket: DgramSocket | null;
    constructor(dpt: DPT, privateKey: Buffer, options: DPTServerOptions);
    bind(...args: any[]): void;
    destroy(...args: any[]): void;
    ping(peer: PeerInfo): Promise<any>;
    findneighbours(peer: PeerInfo, id: Buffer): void;
    _isAliveCheck(): void;
    _send(peer: PeerInfo, typename: string, data: any): Buffer;
    _handler(msg: Buffer, rinfo: RemoteInfo): void;
}
