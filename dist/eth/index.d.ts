/// <reference types="node" />
/// <reference types="bn.js" />
import { EventEmitter } from 'events';
import { BN } from 'ethereumjs-util';
import { Peer } from '../rlpx/peer';
declare type SendMethod = (code: ETH.MESSAGE_CODES, data: Buffer) => any;
export declare class ETH extends EventEmitter {
    _version: number;
    _peer: Peer;
    _status: ETH.StatusMsg | null;
    _peerStatus: ETH.StatusMsg | null;
    _statusTimeoutId: NodeJS.Timeout;
    _send: SendMethod;
    _hardfork: string;
    _latestBlock: BN;
    _forkHash: string;
    _nextForkBlock: BN;
    constructor(version: number, peer: Peer, send: SendMethod);
    static eth62: {
        name: string;
        version: number;
        length: number;
        constructor: typeof ETH;
    };
    static eth63: {
        name: string;
        version: number;
        length: number;
        constructor: typeof ETH;
    };
    static eth64: {
        name: string;
        version: number;
        length: number;
        constructor: typeof ETH;
    };
    static eth65: {
        name: string;
        version: number;
        length: number;
        constructor: typeof ETH;
    };
    _handleMessage(code: ETH.MESSAGE_CODES, data: any): void;
    /**
     * Eth 64 Fork ID validation (EIP-2124)
     * @param forkId Remote fork ID
     */
    _validateForkId(forkId: Buffer[]): void;
    _handleStatus(): void;
    getVersion(): number;
    _forkHashFromForkId(forkId: Buffer): string;
    _nextForkFromForkId(forkId: Buffer): number;
    _getStatusString(status: ETH.StatusMsg): string;
    sendStatus(status: ETH.StatusOpts): void;
    sendMessage(code: ETH.MESSAGE_CODES, payload: any): void;
    getMsgPrefix(msgCode: ETH.MESSAGE_CODES): string;
}
export declare namespace ETH {
    interface StatusMsg extends Array<Buffer | Buffer[]> {
    }
    type StatusOpts = {
        td: Buffer;
        bestHash: Buffer;
        latestBlock?: number;
        genesisHash: Buffer;
    };
    enum MESSAGE_CODES {
        STATUS = 0,
        NEW_BLOCK_HASHES = 1,
        TX = 2,
        GET_BLOCK_HEADERS = 3,
        BLOCK_HEADERS = 4,
        GET_BLOCK_BODIES = 5,
        BLOCK_BODIES = 6,
        NEW_BLOCK = 7,
        GET_NODE_DATA = 13,
        NODE_DATA = 14,
        GET_RECEIPTS = 15,
        RECEIPTS = 16,
        NEW_POOLED_TRANSACTION_HASHES = 8,
        GET_POOLED_TRANSACTIONS = 9,
        POOLED_TRANSACTIONS = 10
    }
}
export {};
