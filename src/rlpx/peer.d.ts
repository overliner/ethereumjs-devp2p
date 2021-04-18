/// <reference types="node" />
import { EventEmitter } from 'events';
import BufferList = require('bl');
import Common from '@ethereumjs/common';
import { ECIES } from './ecies';
import { ETH, LES } from '../';
import { Socket } from 'net';
export declare const BASE_PROTOCOL_VERSION = 4;
export declare const BASE_PROTOCOL_LENGTH = 16;
export declare const PING_INTERVAL: number;
export declare enum PREFIXES {
    HELLO = 0,
    DISCONNECT = 1,
    PING = 2,
    PONG = 3
}
export declare enum DISCONNECT_REASONS {
    DISCONNECT_REQUESTED = 0,
    NETWORK_ERROR = 1,
    PROTOCOL_ERROR = 2,
    USELESS_PEER = 3,
    TOO_MANY_PEERS = 4,
    ALREADY_CONNECTED = 5,
    INCOMPATIBLE_VERSION = 6,
    INVALID_IDENTITY = 7,
    CLIENT_QUITTING = 8,
    UNEXPECTED_IDENTITY = 9,
    SAME_IDENTITY = 10,
    TIMEOUT = 11,
    SUBPROTOCOL_ERROR = 16
}
export declare type HelloMsg = {
    0: Buffer;
    1: Buffer;
    2: Buffer[][];
    3: Buffer;
    4: Buffer;
    length: 5;
};
export interface ProtocolDescriptor {
    protocol?: any;
    offset: number;
    length?: number;
}
export interface ProtocolConstructor {
    new (...args: any[]): any;
}
export interface Capabilities {
    name: string;
    version: number;
    length: number;
    constructor: ProtocolConstructor;
}
export interface Hello {
    protocolVersion: number;
    clientId: string;
    capabilities: Capabilities[];
    port: number;
    id: Buffer;
}
export declare class Peer extends EventEmitter {
    _clientId: Buffer;
    _capabilities?: Capabilities[];
    _common: Common;
    _port: number;
    _id: Buffer;
    _remoteClientIdFilter: any;
    _remoteId: Buffer;
    _EIP8: Buffer;
    _eciesSession: ECIES;
    _state: string;
    _weHello: HelloMsg | null;
    _hello: Hello | null;
    _nextPacketSize: number;
    _socket: Socket;
    _socketData: BufferList;
    _pingIntervalId: NodeJS.Timeout | null;
    _pingTimeoutId: NodeJS.Timeout | null;
    _closed: boolean;
    _connected: boolean;
    _disconnectReason?: DISCONNECT_REASONS;
    _disconnectWe: any;
    _pingTimeout: number;
    _protocols: ProtocolDescriptor[];
    constructor(options: any);
    /**
     * Send AUTH message
     */
    _sendAuth(): void;
    /**
     * Send ACK message
     */
    _sendAck(): void;
    /**
     * Create message HEADER and BODY and send to socket
     * Also called from SubProtocol context
     * @param code
     * @param data
     */
    _sendMessage(code: number, data: Buffer): boolean | undefined;
    /**
     * Send HELLO message
     */
    _sendHello(): void;
    /**
     * Send DISCONNECT message
     * @param reason
     */
    _sendDisconnect(reason: DISCONNECT_REASONS): void;
    /**
     * Send PING message
     */
    _sendPing(): void;
    /**
     * Send PONG message
     */
    _sendPong(): void;
    /**
     * AUTH message received
     */
    _handleAuth(): void;
    /**
     * ACK message received
     */
    _handleAck(): void;
    /**
     * HELLO message received
     */
    _handleHello(payload: any): void;
    /**
     * DISCONNECT message received
     * @param payload
     */
    _handleDisconnect(payload: any): void;
    /**
     * PING message received
     */
    _handlePing(): void;
    /**
     * PONG message received
     */
    _handlePong(): void;
    /**
     * Message handling, called from a SubProtocol context
     * @param code
     * @param msg
     */
    _handleMessage(code: PREFIXES, msg: Buffer): void;
    /**
     * Handle message header
     */
    _handleHeader(): void;
    /**
     * Handle message body
     */
    _handleBody(): void;
    /**
     * Process socket data
     * @param data
     */
    _onSocketData(data: Buffer): void;
    /**
     * React to socket being closed
     */
    _onSocketClose(): void;
    _getProtocol(code: number): ProtocolDescriptor | undefined;
    getId(): Buffer | null;
    getHelloMessage(): Hello | null;
    getProtocols<T extends ETH | LES>(): T[];
    getMsgPrefix(code: PREFIXES): string;
    getDisconnectPrefix(code: DISCONNECT_REASONS): string;
    disconnect(reason?: DISCONNECT_REASONS): void;
}
