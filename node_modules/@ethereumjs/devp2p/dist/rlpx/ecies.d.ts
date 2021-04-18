/// <reference types="node" />
import { Decipher } from 'crypto';
import { MAC } from './mac';
export declare class ECIES {
    _privateKey: Buffer;
    _publicKey: Buffer;
    _remotePublicKey: Buffer | null;
    _nonce: Buffer;
    _remoteNonce: Buffer | null;
    _initMsg: Buffer | null | undefined;
    _remoteInitMsg: Buffer | null;
    _gotEIP8Auth: boolean;
    _gotEIP8Ack: boolean;
    _ingressAes: Decipher | null;
    _egressAes: Decipher | null;
    _ingressMac: MAC | null;
    _egressMac: MAC | null;
    _ephemeralPrivateKey: Buffer;
    _ephemeralPublicKey: Buffer;
    _remoteEphemeralPublicKey: Buffer | null;
    _ephemeralSharedSecret: Buffer | null;
    _bodySize: number | null;
    constructor(privateKey: Buffer, id: Buffer, remoteId: Buffer);
    _encryptMessage(data: Buffer, sharedMacData?: Buffer | null): Buffer | undefined;
    _decryptMessage(data: Buffer, sharedMacData?: Buffer | null): Buffer;
    _setupFrame(remoteData: Buffer, incoming: boolean): void;
    createAuthEIP8(): Buffer | undefined;
    createAuthNonEIP8(): Buffer | undefined;
    parseAuthPlain(data: Buffer, sharedMacData?: Buffer | null): Buffer | undefined;
    parseAuthEIP8(data: Buffer): void;
    createAckEIP8(): Buffer | undefined;
    createAckOld(): Buffer | undefined;
    parseAckPlain(data: Buffer, sharedMacData?: Buffer | null): void;
    parseAckEIP8(data: Buffer): void;
    createHeader(size: number): Buffer | undefined;
    parseHeader(data: Buffer): number | undefined;
    createBody(data: Buffer): Buffer | undefined;
    parseBody(data: Buffer): Buffer | undefined;
}
