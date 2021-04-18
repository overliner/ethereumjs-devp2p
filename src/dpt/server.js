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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const events_1 = require("events");
const dgram = __importStar(require("dgram"));
const ms_1 = __importDefault(require("ms"));
const debug_1 = require("debug");
const LRUCache = require("lru-cache");
const message_1 = require("./message");
const util_1 = require("../util");
const debug = debug_1.debug('devp2p:dpt:server');
const verbose = debug_1.debug('verbose').enabled;
const VERSION = 0x04;
class Server extends events_1.EventEmitter {
    constructor(dpt, privateKey, options) {
        super();
        this._dpt = dpt;
        this._privateKey = privateKey;
        this._timeout = options.timeout || ms_1.default('10s');
        this._endpoint = options.endpoint || { address: '0.0.0.0', udpPort: null, tcpPort: null };
        this._requests = new Map();
        this._parityRequestMap = new Map();
        this._requestsCache = new LRUCache({ max: 1000, maxAge: ms_1.default('1s'), stale: false });
        const createSocket = options.createSocket || dgram.createSocket.bind(null, { type: 'udp4' });
        this._socket = createSocket();
        if (this._socket) {
            this._socket.once('listening', () => this.emit('listening'));
            this._socket.once('close', () => this.emit('close'));
            this._socket.on('error', (err) => this.emit('error', err));
            this._socket.on('message', (msg, rinfo) => {
                try {
                    this._handler(msg, rinfo);
                }
                catch (err) {
                    this.emit('error', err);
                }
            });
        }
    }
    bind(...args) {
        this._isAliveCheck();
        debug('call .bind');
        if (this._socket)
            this._socket.bind(...args);
    }
    destroy(...args) {
        this._isAliveCheck();
        debug('call .destroy');
        if (this._socket) {
            this._socket.close(...args);
            this._socket = null;
        }
    }
    async ping(peer) {
        this._isAliveCheck();
        const rckey = `${peer.address}:${peer.udpPort}`;
        const promise = this._requestsCache.get(rckey);
        if (promise !== undefined)
            return promise;
        const hash = this._send(peer, 'ping', {
            version: VERSION,
            from: this._endpoint,
            to: peer,
        });
        const deferred = util_1.createDeferred();
        const rkey = hash.toString('hex');
        this._requests.set(rkey, {
            peer,
            deferred,
            timeoutId: setTimeout(() => {
                if (this._requests.get(rkey) !== undefined) {
                    debug(`ping timeout: ${peer.address}:${peer.udpPort} ${peer.id ? util_1.formatLogId(peer.id.toString('hex'), verbose) : '-'}`);
                    this._requests.delete(rkey);
                    deferred.reject(new Error(`Timeout error: ping ${peer.address}:${peer.udpPort}`));
                }
                else {
                    return deferred.promise;
                }
            }, this._timeout),
        });
        this._requestsCache.set(rckey, deferred.promise);
        return deferred.promise;
    }
    findneighbours(peer, id) {
        this._isAliveCheck();
        this._send(peer, 'findneighbours', { id });
    }
    _isAliveCheck() {
        if (this._socket === null)
            throw new Error('Server already destroyed');
    }
    _send(peer, typename, data) {
        debug(`send ${typename} to ${peer.address}:${peer.udpPort} (peerId: ${peer.id ? util_1.formatLogId(peer.id.toString('hex'), verbose) : '-'})`);
        const msg = message_1.encode(typename, data, this._privateKey);
        // Parity hack
        // There is a bug in Parity up to at lease 1.8.10 not echoing the hash from
        // discovery spec (hash: sha3(signature || packet-type || packet-data))
        // but just hashing the RLP-encoded packet data (see discovery.rs, on_ping())
        // 2018-02-28
        if (typename === 'ping') {
            const rkeyParity = util_1.keccak256(msg.slice(98)).toString('hex');
            this._parityRequestMap.set(rkeyParity, msg.slice(0, 32).toString('hex'));
            setTimeout(() => {
                if (this._parityRequestMap.get(rkeyParity) !== undefined) {
                    this._parityRequestMap.delete(rkeyParity);
                }
            }, this._timeout);
        }
        if (this._socket && peer.udpPort)
            this._socket.send(msg, 0, msg.length, peer.udpPort, peer.address);
        return msg.slice(0, 32); // message id
    }
    _handler(msg, rinfo) {
        const info = message_1.decode(msg);
        const peerId = util_1.pk2id(info.publicKey);
        debug(`received ${info.typename} from ${rinfo.address}:${rinfo.port} (peerId: ${util_1.formatLogId(peerId.toString('hex'), verbose)})`);
        // add peer if not in our table
        const peer = this._dpt.getPeer(peerId);
        if (peer === null && info.typename === 'ping' && info.data.from.udpPort !== null) {
            setTimeout(() => this.emit('peers', [info.data.from]), ms_1.default('100ms'));
        }
        switch (info.typename) {
            case 'ping': {
                const remote = {
                    id: peerId,
                    udpPort: rinfo.port,
                    address: rinfo.address,
                };
                this._send(remote, 'pong', {
                    to: {
                        address: rinfo.address,
                        udpPort: rinfo.port,
                        tcpPort: info.data.from.tcpPort,
                    },
                    hash: msg.slice(0, 32),
                });
                break;
            }
            case 'pong': {
                let rkey = info.data.hash.toString('hex');
                const rkeyParity = this._parityRequestMap.get(rkey);
                if (rkeyParity) {
                    rkey = rkeyParity;
                    this._parityRequestMap.delete(rkeyParity);
                }
                const request = this._requests.get(rkey);
                if (request) {
                    this._requests.delete(rkey);
                    request.deferred.resolve({
                        id: peerId,
                        address: request.peer.address,
                        udpPort: request.peer.udpPort,
                        tcpPort: request.peer.tcpPort,
                    });
                }
                break;
            }
            case 'findneighbours': {
                const remote = {
                    id: peerId,
                    udpPort: rinfo.port,
                    address: rinfo.address,
                };
                this._send(remote, 'neighbours', {
                    peers: this._dpt.getClosestPeers(info.data.id),
                });
                break;
            }
            case 'neighbours': {
                this.emit('peers', info.data.peers.map((peer) => peer.endpoint));
                break;
            }
        }
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map