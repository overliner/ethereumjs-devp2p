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
exports.LES = exports.DEFAULT_ANNOUNCE_TYPE = void 0;
const events_1 = require("events");
const rlp = __importStar(require("rlp"));
const ms_1 = __importDefault(require("ms"));
const debug_1 = require("debug");
const util_1 = require("../util");
const peer_1 = require("../rlpx/peer");
const debug = debug_1.debug('devp2p:les');
const verbose = debug_1.debug('verbose').enabled;
exports.DEFAULT_ANNOUNCE_TYPE = 1;
class LES extends events_1.EventEmitter {
    constructor(version, peer, send) {
        super();
        this._version = version;
        this._peer = peer;
        this._send = send;
        this._status = null;
        this._peerStatus = null;
        this._statusTimeoutId = setTimeout(() => {
            this._peer.disconnect(peer_1.DISCONNECT_REASONS.TIMEOUT);
        }, ms_1.default('5s'));
    }
    _handleMessage(code, data) {
        const payload = rlp.decode(data);
        if (code !== LES.MESSAGE_CODES.STATUS) {
            const debugMsg = `Received ${this.getMsgPrefix(code)} message from ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort}`;
            const logData = util_1.formatLogData(data.toString('hex'), verbose);
            debug(`${debugMsg}: ${logData}`);
        }
        switch (code) {
            case LES.MESSAGE_CODES.STATUS: {
                util_1.assertEq(this._peerStatus, null, 'Uncontrolled status message', debug);
                const statusArray = {};
                payload.forEach(function (value) {
                    statusArray[value[0].toString()] = value[1];
                });
                this._peerStatus = statusArray;
                debug(`Received ${this.getMsgPrefix(code)} message from ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort}: : ${this._peerStatus ? this._getStatusString(this._peerStatus) : ''}`);
                this._handleStatus();
                break;
            }
            case LES.MESSAGE_CODES.ANNOUNCE:
            case LES.MESSAGE_CODES.GET_BLOCK_HEADERS:
            case LES.MESSAGE_CODES.BLOCK_HEADERS:
            case LES.MESSAGE_CODES.GET_BLOCK_BODIES:
            case LES.MESSAGE_CODES.BLOCK_BODIES:
            case LES.MESSAGE_CODES.GET_RECEIPTS:
            case LES.MESSAGE_CODES.RECEIPTS:
            case LES.MESSAGE_CODES.GET_PROOFS:
            case LES.MESSAGE_CODES.PROOFS:
            case LES.MESSAGE_CODES.GET_CONTRACT_CODES:
            case LES.MESSAGE_CODES.CONTRACT_CODES:
            case LES.MESSAGE_CODES.GET_HEADER_PROOFS:
            case LES.MESSAGE_CODES.HEADER_PROOFS:
            case LES.MESSAGE_CODES.SEND_TX:
            case LES.MESSAGE_CODES.GET_PROOFS_V2:
            case LES.MESSAGE_CODES.PROOFS_V2:
            case LES.MESSAGE_CODES.GET_HELPER_TRIE_PROOFS:
            case LES.MESSAGE_CODES.HELPER_TRIE_PROOFS:
            case LES.MESSAGE_CODES.SEND_TX_V2:
            case LES.MESSAGE_CODES.GET_TX_STATUS:
            case LES.MESSAGE_CODES.TX_STATUS:
                if (this._version >= LES.les2.version)
                    break;
                return;
            default:
                return;
        }
        this.emit('message', code, payload);
    }
    _handleStatus() {
        if (this._status === null || this._peerStatus === null)
            return;
        clearTimeout(this._statusTimeoutId);
        util_1.assertEq(this._status['protocolVersion'], this._peerStatus['protocolVersion'], 'Protocol version mismatch', debug);
        util_1.assertEq(this._status['networkId'], this._peerStatus['networkId'], 'NetworkId mismatch', debug);
        util_1.assertEq(this._status['genesisHash'], this._peerStatus['genesisHash'], 'Genesis block mismatch', debug);
        this.emit('status', this._peerStatus);
    }
    getVersion() {
        return this._version;
    }
    _getStatusString(status) {
        let sStr = `[V:${util_1.buffer2int(status['protocolVersion'])}, `;
        sStr += `NID:${util_1.buffer2int(status['networkId'])}, HTD:${util_1.buffer2int(status['headTd'])}, `;
        sStr += `HeadH:${status['headHash'].toString('hex')}, HeadN:${util_1.buffer2int(status['headNum'])}, `;
        sStr += `GenH:${status['genesisHash'].toString('hex')}`;
        if (status['serveHeaders'])
            sStr += `, serveHeaders active`;
        if (status['serveChainSince'])
            sStr += `, ServeCS: ${util_1.buffer2int(status['serveChainSince'])}`;
        if (status['serveStateSince'])
            sStr += `, ServeSS: ${util_1.buffer2int(status['serveStateSince'])}`;
        if (status['txRelax'])
            sStr += `, txRelay active`;
        if (status['flowControl/BL'])
            sStr += `, flowControl/BL set`;
        if (status['flowControl/MRR'])
            sStr += `, flowControl/MRR set`;
        if (status['flowControl/MRC'])
            sStr += `, flowControl/MRC set`;
        sStr += `]`;
        return sStr;
    }
    sendStatus(status) {
        if (this._status !== null)
            return;
        if (!status.announceType) {
            status['announceType'] = exports.DEFAULT_ANNOUNCE_TYPE;
        }
        status['announceType'] = util_1.int2buffer(status['announceType']);
        status['protocolVersion'] = util_1.int2buffer(this._version);
        status['networkId'] = this._peer._common.chainIdBN().toArrayLike(Buffer);
        this._status = status;
        const statusList = [];
        Object.keys(status).forEach((key) => {
            statusList.push([key, status[key]]);
        });
        debug(`Send STATUS message to ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort} (les${this._version}): ${this._getStatusString(this._status)}`);
        this._send(LES.MESSAGE_CODES.STATUS, rlp.encode(statusList));
        this._handleStatus();
    }
    /**
     *
     * @param code Message code
     * @param payload Payload (including reqId, e.g. `[1, [437000, 1, 0, 0]]`)
     */
    sendMessage(code, payload) {
        const debugMsg = `Send ${this.getMsgPrefix(code)} message to ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort}`;
        const logData = util_1.formatLogData(rlp.encode(payload).toString('hex'), verbose);
        debug(`${debugMsg}: ${logData}`);
        switch (code) {
            case LES.MESSAGE_CODES.STATUS:
                throw new Error('Please send status message through .sendStatus');
            case LES.MESSAGE_CODES.ANNOUNCE: // LES/1
            case LES.MESSAGE_CODES.GET_BLOCK_HEADERS:
            case LES.MESSAGE_CODES.BLOCK_HEADERS:
            case LES.MESSAGE_CODES.GET_BLOCK_BODIES:
            case LES.MESSAGE_CODES.BLOCK_BODIES:
            case LES.MESSAGE_CODES.GET_RECEIPTS:
            case LES.MESSAGE_CODES.RECEIPTS:
            case LES.MESSAGE_CODES.GET_PROOFS:
            case LES.MESSAGE_CODES.PROOFS:
            case LES.MESSAGE_CODES.GET_CONTRACT_CODES:
            case LES.MESSAGE_CODES.CONTRACT_CODES:
            case LES.MESSAGE_CODES.GET_HEADER_PROOFS:
            case LES.MESSAGE_CODES.HEADER_PROOFS:
            case LES.MESSAGE_CODES.SEND_TX:
            case LES.MESSAGE_CODES.GET_PROOFS_V2: // LES/2
            case LES.MESSAGE_CODES.PROOFS_V2:
            case LES.MESSAGE_CODES.GET_HELPER_TRIE_PROOFS:
            case LES.MESSAGE_CODES.HELPER_TRIE_PROOFS:
            case LES.MESSAGE_CODES.SEND_TX_V2:
            case LES.MESSAGE_CODES.GET_TX_STATUS:
            case LES.MESSAGE_CODES.TX_STATUS:
                if (this._version >= LES.les2.version)
                    break;
                throw new Error(`Code ${code} not allowed with version ${this._version}`);
            default:
                throw new Error(`Unknown code ${code}`);
        }
        this._send(code, rlp.encode(payload));
    }
    getMsgPrefix(msgCode) {
        return LES.MESSAGE_CODES[msgCode];
    }
}
exports.LES = LES;
LES.les2 = { name: 'les', version: 2, length: 21, constructor: LES };
(function (LES) {
    let MESSAGE_CODES;
    (function (MESSAGE_CODES) {
        // LES/1
        MESSAGE_CODES[MESSAGE_CODES["STATUS"] = 0] = "STATUS";
        MESSAGE_CODES[MESSAGE_CODES["ANNOUNCE"] = 1] = "ANNOUNCE";
        MESSAGE_CODES[MESSAGE_CODES["GET_BLOCK_HEADERS"] = 2] = "GET_BLOCK_HEADERS";
        MESSAGE_CODES[MESSAGE_CODES["BLOCK_HEADERS"] = 3] = "BLOCK_HEADERS";
        MESSAGE_CODES[MESSAGE_CODES["GET_BLOCK_BODIES"] = 4] = "GET_BLOCK_BODIES";
        MESSAGE_CODES[MESSAGE_CODES["BLOCK_BODIES"] = 5] = "BLOCK_BODIES";
        MESSAGE_CODES[MESSAGE_CODES["GET_RECEIPTS"] = 6] = "GET_RECEIPTS";
        MESSAGE_CODES[MESSAGE_CODES["RECEIPTS"] = 7] = "RECEIPTS";
        MESSAGE_CODES[MESSAGE_CODES["GET_PROOFS"] = 8] = "GET_PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["PROOFS"] = 9] = "PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["GET_CONTRACT_CODES"] = 10] = "GET_CONTRACT_CODES";
        MESSAGE_CODES[MESSAGE_CODES["CONTRACT_CODES"] = 11] = "CONTRACT_CODES";
        MESSAGE_CODES[MESSAGE_CODES["GET_HEADER_PROOFS"] = 13] = "GET_HEADER_PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["HEADER_PROOFS"] = 14] = "HEADER_PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["SEND_TX"] = 12] = "SEND_TX";
        // LES/2
        MESSAGE_CODES[MESSAGE_CODES["GET_PROOFS_V2"] = 15] = "GET_PROOFS_V2";
        MESSAGE_CODES[MESSAGE_CODES["PROOFS_V2"] = 16] = "PROOFS_V2";
        MESSAGE_CODES[MESSAGE_CODES["GET_HELPER_TRIE_PROOFS"] = 17] = "GET_HELPER_TRIE_PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["HELPER_TRIE_PROOFS"] = 18] = "HELPER_TRIE_PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["SEND_TX_V2"] = 19] = "SEND_TX_V2";
        MESSAGE_CODES[MESSAGE_CODES["GET_TX_STATUS"] = 20] = "GET_TX_STATUS";
        MESSAGE_CODES[MESSAGE_CODES["TX_STATUS"] = 21] = "TX_STATUS";
    })(MESSAGE_CODES = LES.MESSAGE_CODES || (LES.MESSAGE_CODES = {}));
})(LES = exports.LES || (exports.LES = {}));
//# sourceMappingURL=index.js.map