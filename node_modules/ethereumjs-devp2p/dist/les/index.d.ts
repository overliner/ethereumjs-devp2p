/// <reference types="node" />
import { EventEmitter } from 'events';
import { Peer } from '../rlpx/peer';
export declare const DEFAULT_ANNOUNCE_TYPE = 1;
export declare class LES extends EventEmitter {
    _version: any;
    _peer: Peer;
    _send: any;
    _status: LES.Status | null;
    _peerStatus: LES.Status | null;
    _statusTimeoutId: NodeJS.Timeout;
    constructor(version: number, peer: Peer, send: any);
    static les2: {
        name: string;
        version: number;
        length: number;
        constructor: typeof LES;
    };
    _handleMessage(code: LES.MESSAGE_CODES, data: any): void;
    _handleStatus(): void;
    getVersion(): any;
    _getStatusString(status: LES.Status): string;
    sendStatus(status: LES.Status): void;
    /**
     *
     * @param code Message code
     * @param payload Payload (including reqId, e.g. `[1, [437000, 1, 0, 0]]`)
     */
    sendMessage(code: LES.MESSAGE_CODES, payload: any): void;
    getMsgPrefix(msgCode: LES.MESSAGE_CODES): string;
}
export declare namespace LES {
    interface Status {
        [key: string]: Buffer | number;
        protocolVersion: Buffer;
        headTd: Buffer;
        headHash: Buffer;
        headNum: Buffer;
        genesisHash: Buffer;
        serveHeaders: Buffer;
        serveChainSince: Buffer;
        serveStateSince: Buffer;
        txRelax: Buffer;
        'flowControl/BL': Buffer;
        'flowControl/MRR': Buffer;
        'flowControl/MRC': Buffer;
        announceType: Buffer | number;
    }
    enum MESSAGE_CODES {
        STATUS = 0,
        ANNOUNCE = 1,
        GET_BLOCK_HEADERS = 2,
        BLOCK_HEADERS = 3,
        GET_BLOCK_BODIES = 4,
        BLOCK_BODIES = 5,
        GET_RECEIPTS = 6,
        RECEIPTS = 7,
        GET_PROOFS = 8,
        PROOFS = 9,
        GET_CONTRACT_CODES = 10,
        CONTRACT_CODES = 11,
        GET_HEADER_PROOFS = 13,
        HEADER_PROOFS = 14,
        SEND_TX = 12,
        GET_PROOFS_V2 = 15,
        PROOFS_V2 = 16,
        GET_HELPER_TRIE_PROOFS = 17,
        HELPER_TRIE_PROOFS = 18,
        SEND_TX_V2 = 19,
        GET_TX_STATUS = 20,
        TX_STATUS = 21
    }
}
