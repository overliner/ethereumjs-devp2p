"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ETH = void 0;
const assert_1 = __importDefault(require("assert"));
const events_1 = require("events");
const rlp = __importStar(require("rlp"));
const ms_1 = __importDefault(require("ms"));
const ethereumjs_util_1 = require("ethereumjs-util");
const util_1 = require("../util");
const peer_1 = require("../rlpx/peer");
const debug_1 = require("debug");
const debug = debug_1.debug('devp2p:eth');
const verbose = debug_1.debug('verbose').enabled;
class ETH extends events_1.EventEmitter {
    constructor(version, peer, send) {
        var _a;
        super();
        // Eth64
        this._hardfork = 'chainstart';
        this._latestBlock = new ethereumjs_util_1.BN(0);
        this._forkHash = '';
        this._nextForkBlock = new ethereumjs_util_1.BN(0);
        this._version = version;
        this._peer = peer;
        this._send = send;
        this._status = null;
        this._peerStatus = null;
        this._statusTimeoutId = setTimeout(() => {
            this._peer.disconnect(peer_1.DISCONNECT_REASONS.TIMEOUT);
        }, ms_1.default('5s'));
        // Set forkHash and nextForkBlock
        if (this._version >= 64) {
            const c = this._peer._common;
            this._hardfork = c.hardfork() ? c.hardfork() : this._hardfork;
            // Set latestBlock minimally to start block of fork to have some more
            // accurate basis if no latestBlock is provided along status send
            this._latestBlock = c.hardforkBlockBN(this._hardfork);
            this._forkHash = c.forkHash(this._hardfork);
            // Next fork block number or 0 if none available
            this._nextForkBlock = (_a = c.nextHardforkBlockBN(this._hardfork)) !== null && _a !== void 0 ? _a : new ethereumjs_util_1.BN(0);
        }
    }
    _handleMessage(code, data) {
        const payload = rlp.decode(data);
        if (code !== ETH.MESSAGE_CODES.STATUS) {
            const debugMsg = `Received ${this.getMsgPrefix(code)} message from ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort}`;
            const logData = util_1.formatLogData(data.toString('hex'), verbose);
            debug(`${debugMsg}: ${logData}`);
        }
        switch (code) {
            case ETH.MESSAGE_CODES.STATUS:
                util_1.assertEq(this._peerStatus, null, 'Uncontrolled status message', debug);
                this._peerStatus = payload;
                debug(`Received ${this.getMsgPrefix(code)} message from ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort}: : ${this._peerStatus ? this._getStatusString(this._peerStatus) : ''}`);
                this._handleStatus();
                break;
            case ETH.MESSAGE_CODES.NEW_BLOCK_HASHES:
            case ETH.MESSAGE_CODES.TX:
            case ETH.MESSAGE_CODES.GET_BLOCK_HEADERS:
            case ETH.MESSAGE_CODES.BLOCK_HEADERS:
            case ETH.MESSAGE_CODES.GET_BLOCK_BODIES:
            case ETH.MESSAGE_CODES.BLOCK_BODIES:
            case ETH.MESSAGE_CODES.NEW_BLOCK:
                if (this._version >= ETH.eth62.version)
                    break;
                return;
            case ETH.MESSAGE_CODES.GET_NODE_DATA:
            case ETH.MESSAGE_CODES.NODE_DATA:
            case ETH.MESSAGE_CODES.GET_RECEIPTS:
            case ETH.MESSAGE_CODES.RECEIPTS:
                if (this._version >= ETH.eth63.version)
                    break;
                return;
            case ETH.MESSAGE_CODES.NEW_POOLED_TRANSACTION_HASHES:
            case ETH.MESSAGE_CODES.GET_POOLED_TRANSACTIONS:
            case ETH.MESSAGE_CODES.POOLED_TRANSACTIONS:
                if (this._version >= ETH.eth65.version)
                    break;
                return;
            default:
                return;
        }
        this.emit('message', code, payload);
    }
    /**
     * Eth 64 Fork ID validation (EIP-2124)
     * @param forkId Remote fork ID
     */
    _validateForkId(forkId) {
        const c = this._peer._common;
        const peerForkHash = `0x${forkId[0].toString('hex')}`;
        const peerNextFork = new ethereumjs_util_1.BN(forkId[1]);
        if (this._forkHash === peerForkHash) {
            // There is a known next fork
            if (!peerNextFork.isZero()) {
                if (this._latestBlock.gte(peerNextFork)) {
                    const msg = 'Remote is advertising a future fork that passed locally';
                    debug(msg);
                    throw new assert_1.default.AssertionError({ message: msg });
                }
            }
        }
        const peerFork = c.hardforkForForkHash(peerForkHash);
        if (peerFork === null) {
            const msg = 'Unknown fork hash';
            debug(msg);
            throw new assert_1.default.AssertionError({ message: msg });
        }
        if (!c.hardforkGteHardfork(peerFork.name, this._hardfork)) {
            const nextHardforkBlock = c.nextHardforkBlockBN(peerFork.name);
            if (peerNextFork === null || !nextHardforkBlock || !nextHardforkBlock.eq(peerNextFork)) {
                const msg = 'Outdated fork status, remote needs software update';
                debug(msg);
                throw new assert_1.default.AssertionError({ message: msg });
            }
        }
    }
    _handleStatus() {
        if (this._status === null || this._peerStatus === null)
            return;
        clearTimeout(this._statusTimeoutId);
        util_1.assertEq(this._status[0], this._peerStatus[0], 'Protocol version mismatch', debug);
        util_1.assertEq(this._status[1], this._peerStatus[1], 'NetworkId mismatch', debug);
        util_1.assertEq(this._status[4], this._peerStatus[4], 'Genesis block mismatch', debug);
        const status = {
            networkId: this._peerStatus[1],
            td: Buffer.from(this._peerStatus[2]),
            bestHash: Buffer.from(this._peerStatus[3]),
            genesisHash: Buffer.from(this._peerStatus[4]),
        };
        if (this._version >= 64) {
            util_1.assertEq(this._peerStatus[5].length, 2, 'Incorrect forkId msg format', debug);
            this._validateForkId(this._peerStatus[5]);
            status['forkId'] = this._peerStatus[5];
        }
        this.emit('status', status);
    }
    getVersion() {
        return this._version;
    }
    _forkHashFromForkId(forkId) {
        return `0x${forkId.toString('hex')}`;
    }
    _nextForkFromForkId(forkId) {
        return util_1.buffer2int(forkId);
    }
    _getStatusString(status) {
        let sStr = `[V:${util_1.buffer2int(status[0])}, NID:${util_1.buffer2int(status[1])}, TD:${util_1.buffer2int(status[2])}`;
        sStr += `, BestH:${util_1.formatLogId(status[3].toString('hex'), verbose)}, GenH:${util_1.formatLogId(status[4].toString('hex'), verbose)}`;
        if (this._version >= 64) {
            sStr += `, ForkHash: ${status[5] ? '0x' + status[5][0].toString('hex') : '-'}`;
            sStr += `, ForkNext: ${status[5] ? util_1.buffer2int(status[5][1]) : '-'}`;
        }
        sStr += `]`;
        return sStr;
    }
    sendStatus(status) {
        if (this._status !== null)
            return;
        this._status = [
            util_1.int2buffer(this._version),
            this._peer._common.chainIdBN().toArrayLike(Buffer),
            status.td,
            status.bestHash,
            status.genesisHash,
        ];
        if (this._version >= 64) {
            if (status.latestBlock) {
                const latestBlock = new ethereumjs_util_1.BN(status.latestBlock);
                if (latestBlock.lt(this._latestBlock)) {
                    throw new Error('latest block provided is not matching the HF setting of the Common instance (Rlpx)');
                }
                this._latestBlock = latestBlock;
            }
            const forkHashB = Buffer.from(this._forkHash.substr(2), 'hex');
            const nextForkB = this._nextForkBlock.toArrayLike(Buffer);
            this._status.push([forkHashB, nextForkB]);
        }
        debug(`Send STATUS message to ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort} (eth${this._version}): ${this._getStatusString(this._status)}`);
        this._send(ETH.MESSAGE_CODES.STATUS, rlp.encode(this._status));
        this._handleStatus();
    }
    sendMessage(code, payload) {
        const debugMsg = `Send ${this.getMsgPrefix(code)} message to ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort}`;
        const logData = util_1.formatLogData(rlp.encode(payload).toString('hex'), verbose);
        debug(`${debugMsg}: ${logData}`);
        switch (code) {
            case ETH.MESSAGE_CODES.STATUS:
                throw new Error('Please send status message through .sendStatus');
            case ETH.MESSAGE_CODES.NEW_BLOCK_HASHES:
            case ETH.MESSAGE_CODES.TX:
            case ETH.MESSAGE_CODES.GET_BLOCK_HEADERS:
            case ETH.MESSAGE_CODES.BLOCK_HEADERS:
            case ETH.MESSAGE_CODES.GET_BLOCK_BODIES:
            case ETH.MESSAGE_CODES.BLOCK_BODIES:
            case ETH.MESSAGE_CODES.NEW_BLOCK:
                if (this._version >= ETH.eth62.version)
                    break;
                throw new Error(`Code ${code} not allowed with version ${this._version}`);
            case ETH.MESSAGE_CODES.GET_NODE_DATA:
            case ETH.MESSAGE_CODES.NODE_DATA:
            case ETH.MESSAGE_CODES.GET_RECEIPTS:
            case ETH.MESSAGE_CODES.RECEIPTS:
                if (this._version >= ETH.eth63.version)
                    break;
                throw new Error(`Code ${code} not allowed with version ${this._version}`);
            case ETH.MESSAGE_CODES.NEW_POOLED_TRANSACTION_HASHES:
            case ETH.MESSAGE_CODES.GET_POOLED_TRANSACTIONS:
            case ETH.MESSAGE_CODES.POOLED_TRANSACTIONS:
                if (this._version >= ETH.eth65.version)
                    break;
                throw new Error(`Code ${code} not allowed with version ${this._version}`);
            default:
                throw new Error(`Unknown code ${code}`);
        }
        this._send(code, rlp.encode(payload));
    }
    getMsgPrefix(msgCode) {
        return ETH.MESSAGE_CODES[msgCode];
    }
}
exports.ETH = ETH;
ETH.eth62 = { name: 'eth', version: 62, length: 8, constructor: ETH };
ETH.eth63 = { name: 'eth', version: 63, length: 17, constructor: ETH };
ETH.eth64 = { name: 'eth', version: 64, length: 29, constructor: ETH };
ETH.eth65 = { name: 'eth', version: 65, length: 29, constructor: ETH };
(function (ETH) {
    let MESSAGE_CODES;
    (function (MESSAGE_CODES) {
        // eth62
        MESSAGE_CODES[MESSAGE_CODES["STATUS"] = 0] = "STATUS";
        MESSAGE_CODES[MESSAGE_CODES["NEW_BLOCK_HASHES"] = 1] = "NEW_BLOCK_HASHES";
        MESSAGE_CODES[MESSAGE_CODES["TX"] = 2] = "TX";
        MESSAGE_CODES[MESSAGE_CODES["GET_BLOCK_HEADERS"] = 3] = "GET_BLOCK_HEADERS";
        MESSAGE_CODES[MESSAGE_CODES["BLOCK_HEADERS"] = 4] = "BLOCK_HEADERS";
        MESSAGE_CODES[MESSAGE_CODES["GET_BLOCK_BODIES"] = 5] = "GET_BLOCK_BODIES";
        MESSAGE_CODES[MESSAGE_CODES["BLOCK_BODIES"] = 6] = "BLOCK_BODIES";
        MESSAGE_CODES[MESSAGE_CODES["NEW_BLOCK"] = 7] = "NEW_BLOCK";
        // eth63
        MESSAGE_CODES[MESSAGE_CODES["GET_NODE_DATA"] = 13] = "GET_NODE_DATA";
        MESSAGE_CODES[MESSAGE_CODES["NODE_DATA"] = 14] = "NODE_DATA";
        MESSAGE_CODES[MESSAGE_CODES["GET_RECEIPTS"] = 15] = "GET_RECEIPTS";
        MESSAGE_CODES[MESSAGE_CODES["RECEIPTS"] = 16] = "RECEIPTS";
        // eth65
        MESSAGE_CODES[MESSAGE_CODES["NEW_POOLED_TRANSACTION_HASHES"] = 8] = "NEW_POOLED_TRANSACTION_HASHES";
        MESSAGE_CODES[MESSAGE_CODES["GET_POOLED_TRANSACTIONS"] = 9] = "GET_POOLED_TRANSACTIONS";
        MESSAGE_CODES[MESSAGE_CODES["POOLED_TRANSACTIONS"] = 10] = "POOLED_TRANSACTIONS";
    })(MESSAGE_CODES = ETH.MESSAGE_CODES || (ETH.MESSAGE_CODES = {}));
})(ETH = exports.ETH || (exports.ETH = {}));
//# sourceMappingURL=index.js.map