/// <reference types="node" />
import { EventEmitter } from 'events';
import { BanList } from './ban-list';
import { DNS } from '../dns';
export interface PeerInfo {
    id?: Uint8Array | Buffer;
    address?: string;
    udpPort?: number | null;
    tcpPort?: number | null;
}
export interface DPTOptions {
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
    /**
     * Interval for peer table refresh
     *
     * Default: 60s
     */
    refreshInterval?: number;
    /**
     * Toggles whether or not peers should be queried with 'findNeighbours'
     * to discover more peers
     *
     * Default: true
     */
    shouldFindNeighbours?: boolean;
    /**
     * Toggles whether or not peers should be discovered by querying EIP-1459 DNS lists
     *
     * Default: false
     */
    shouldGetDnsPeers?: boolean;
    /**
     * Max number of candidate peers to retrieve from DNS records when
     * attempting to discover new nodes
     *
     * Default: 25
     */
    dnsRefreshQuantity?: number;
    /**
     * EIP-1459 ENR tree urls to query for peer discovery
     *
     * Default: (network dependent)
     */
    dnsNetworks?: string[];
    /**
     * DNS server to query DNS TXT records from for peer discovery
     */
    dnsAddr?: string;
}
export declare class DPT extends EventEmitter {
    privateKey: Buffer;
    banlist: BanList;
    dns: DNS;
    private _id;
    private _kbucket;
    private _server;
    private _refreshIntervalId;
    private _refreshIntervalSelectionCounter;
    private _shouldFindNeighbours;
    private _shouldGetDnsPeers;
    private _dnsRefreshQuantity;
    private _dnsNetworks;
    private _dnsAddr;
    constructor(privateKey: Buffer, options: DPTOptions);
    bind(...args: any[]): void;
    destroy(...args: any[]): void;
    _onKBucketPing(oldPeers: PeerInfo[], newPeer: PeerInfo): void;
    _addPeerBatch(peers: PeerInfo[]): void;
    bootstrap(peer: PeerInfo): Promise<void>;
    addPeer(obj: PeerInfo): Promise<any>;
    getPeer(obj: string | Buffer | PeerInfo): PeerInfo | null;
    getPeers(): PeerInfo[];
    getClosestPeers(id: string): PeerInfo[];
    removePeer(obj: any): void;
    banPeer(obj: string | Buffer | PeerInfo, maxAge?: number): void;
    getDnsPeers(): Promise<PeerInfo[]>;
    refresh(): Promise<void>;
}
