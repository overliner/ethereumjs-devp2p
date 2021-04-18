/// <reference types="node" />
import { ETH } from './eth';
import { LES } from './les';
export declare function keccak256(...buffers: Buffer[]): Buffer;
export declare function genPrivateKey(): Buffer;
export declare function pk2id(pk: Buffer): Buffer;
export declare function id2pk(id: Buffer): Buffer;
export declare function int2buffer(v: number | null): Buffer;
export declare function buffer2int(buffer: Buffer): number;
export declare function zfill(buffer: Buffer, size: number, leftpad?: boolean): Buffer;
export declare function xor(a: Buffer, b: any): Buffer;
declare type assertInput = Buffer | Buffer[] | ETH.StatusMsg | LES.Status | number | null;
export declare function assertEq(expected: assertInput, actual: assertInput, msg: string, debug: Function): void;
export declare function formatLogId(id: string, verbose: boolean): string;
export declare function formatLogData(data: string, verbose: boolean): string;
export declare class Deferred<T> {
    promise: Promise<T>;
    resolve: (...args: any[]) => any;
    reject: (...args: any[]) => any;
    constructor();
}
export declare function createDeferred<T>(): Deferred<T>;
export declare function unstrictDecode(value: Buffer): any;
export declare function toNewUint8Array(buf: Uint8Array): Uint8Array;
export {};
