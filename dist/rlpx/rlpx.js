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
exports.RLPx = void 0;
const net = __importStar(require("net"));
const os = __importStar(require("os"));
const ms_1 = __importDefault(require("ms"));
const secp256k1_1 = require("secp256k1");
const events_1 = require("events");
const debug_1 = require("debug");
const lru_cache_1 = __importDefault(require("lru-cache"));
// note: relative path only valid in .js file in dist
const { version: pVersion } = require('../../package.json');
const util_1 = require("../util");
const peer_1 = require("./peer");
const debug = debug_1.debug('devp2p:rlpx');
const verbose = debug_1.debug('verbose').enabled;
class RLPx extends events_1.EventEmitter {
    constructor(privateKey, options) {
        var _a, _b, _c, _d;
        super();
        this._refillIntervalSelectionCounter = 0;
        this._privateKey = Buffer.from(privateKey);
        this._id = util_1.pk2id(Buffer.from(secp256k1_1.publicKeyCreate(this._privateKey, false)));
        // options
        this._timeout = (_a = options.timeout) !== null && _a !== void 0 ? _a : ms_1.default('10s');
        this._maxPeers = (_b = options.maxPeers) !== null && _b !== void 0 ? _b : 10;
        this._clientId = options.clientId
            ? Buffer.from(options.clientId)
            : Buffer.from(`ethereumjs-devp2p/v${pVersion}/${os.platform()}-${os.arch()}/nodejs`);
        this._remoteClientIdFilter = options.remoteClientIdFilter;
        this._capabilities = options.capabilities;
        this._common = options.common;
        this._listenPort = (_c = options.listenPort) !== null && _c !== void 0 ? _c : null;
        // DPT
        this._dpt = (_d = options.dpt) !== null && _d !== void 0 ? _d : null;
        if (this._dpt !== null) {
            this._dpt.on('peer:new', (peer) => {
                if (!peer.tcpPort) {
                    this._dpt.banPeer(peer, ms_1.default('5m'));
                    debug(`banning peer with missing tcp port: ${peer.address}`);
                    return;
                }
                if (this._peersLRU.has(peer.id.toString('hex')))
                    return;
                this._peersLRU.set(peer.id.toString('hex'), true);
                if (this._getOpenSlots() > 0)
                    return this._connectToPeer(peer);
                this._peersQueue.push({ peer: peer, ts: 0 }); // save to queue
            });
            this._dpt.on('peer:removed', (peer) => {
                // remove from queue
                this._peersQueue = this._peersQueue.filter((item) => !item.peer.id.equals(peer.id));
            });
        }
        // internal
        this._server = net.createServer();
        this._server.once('listening', () => this.emit('listening'));
        this._server.once('close', () => this.emit('close'));
        this._server.on('error', (err) => this.emit('error', err));
        this._server.on('connection', (socket) => this._onConnect(socket, null));
        this._peers = new Map();
        this._peersQueue = [];
        this._peersLRU = new lru_cache_1.default({ max: 25000 });
        const REFILL_INTERVALL = ms_1.default('10s');
        const refillIntervalSubdivided = Math.floor(REFILL_INTERVALL / 10);
        this._refillIntervalId = setInterval(() => this._refillConnections(), refillIntervalSubdivided);
    }
    listen(...args) {
        this._isAliveCheck();
        debug('call .listen');
        if (this._server)
            this._server.listen(...args);
    }
    destroy(...args) {
        this._isAliveCheck();
        debug('call .destroy');
        clearInterval(this._refillIntervalId);
        if (this._server)
            this._server.close(...args);
        this._server = null;
        for (const peerKey of this._peers.keys())
            this.disconnect(Buffer.from(peerKey, 'hex'));
    }
    async connect(peer) {
        if (!peer.tcpPort || !peer.address)
            return;
        this._isAliveCheck();
        if (!Buffer.isBuffer(peer.id))
            throw new TypeError('Expected peer.id as Buffer');
        const peerKey = peer.id.toString('hex');
        if (this._peers.has(peerKey))
            throw new Error('Already connected');
        if (this._getOpenSlots() === 0)
            throw new Error('Too many peers already connected');
        debug(`connect to ${peer.address}:${peer.tcpPort} (id: ${util_1.formatLogId(peerKey, verbose)})`);
        const deferred = util_1.createDeferred();
        const socket = new net.Socket();
        this._peers.set(peerKey, socket);
        socket.once('close', () => {
            this._peers.delete(peerKey);
            this._refillConnections();
        });
        socket.once('error', deferred.reject);
        socket.setTimeout(this._timeout, () => deferred.reject(new Error('Connection timeout')));
        socket.connect(peer.tcpPort, peer.address, deferred.resolve);
        await deferred.promise;
        this._onConnect(socket, peer.id);
    }
    getPeers() {
        return Array.from(this._peers.values()).filter((item) => item instanceof peer_1.Peer);
    }
    disconnect(id) {
        const peer = this._peers.get(id.toString('hex'));
        if (peer instanceof peer_1.Peer)
            peer.disconnect(peer_1.DISCONNECT_REASONS.CLIENT_QUITTING);
    }
    _isAlive() {
        return this._server !== null;
    }
    _isAliveCheck() {
        if (!this._isAlive())
            throw new Error('Server already destroyed');
    }
    _getOpenSlots() {
        return Math.max(this._maxPeers - this._peers.size, 0);
    }
    _connectToPeer(peer) {
        this.connect(peer).catch((err) => {
            if (this._dpt === null)
                return;
            if (err.code === 'ECONNRESET' || err.toString().includes('Connection timeout')) {
                this._dpt.banPeer(peer, ms_1.default('5m'));
            }
        });
    }
    _onConnect(socket, peerId) {
        debug(`connected to ${socket.remoteAddress}:${socket.remotePort}, handshake waiting..`);
        const peer = new peer_1.Peer({
            socket: socket,
            remoteId: peerId,
            privateKey: this._privateKey,
            id: this._id,
            timeout: this._timeout,
            clientId: this._clientId,
            remoteClientIdFilter: this._remoteClientIdFilter,
            capabilities: this._capabilities,
            common: this._common,
            port: this._listenPort,
        });
        peer.on('error', (err) => this.emit('peer:error', peer, err));
        // handle incoming connection
        if (peerId === null && this._getOpenSlots() === 0) {
            peer.once('connect', () => peer.disconnect(peer_1.DISCONNECT_REASONS.TOO_MANY_PEERS));
            socket.once('error', () => { });
            return;
        }
        peer.once('connect', () => {
            let msg = `handshake with ${socket.remoteAddress}:${socket.remotePort} was successful`;
            if (peer._eciesSession._gotEIP8Auth === true) {
                msg += ` (peer eip8 auth)`;
            }
            if (peer._eciesSession._gotEIP8Ack === true) {
                msg += ` (peer eip8 ack)`;
            }
            debug(msg);
            const id = peer.getId();
            if (id && id.equals(this._id)) {
                return peer.disconnect(peer_1.DISCONNECT_REASONS.SAME_IDENTITY);
            }
            const peerKey = id.toString('hex');
            const item = this._peers.get(peerKey);
            if (item && item instanceof peer_1.Peer) {
                return peer.disconnect(peer_1.DISCONNECT_REASONS.ALREADY_CONNECTED);
            }
            this._peers.set(peerKey, peer);
            this.emit('peer:added', peer);
        });
        peer.once('close', (reason, disconnectWe) => {
            if (disconnectWe) {
                debug(`disconnect from ${socket.remoteAddress}:${socket.remotePort}, reason: ${peer_1.DISCONNECT_REASONS[reason]}`);
            }
            else {
                debug(`${socket.remoteAddress}:${socket.remotePort} disconnect, reason: ${peer_1.DISCONNECT_REASONS[reason]}`);
            }
            if (!disconnectWe && reason === peer_1.DISCONNECT_REASONS.TOO_MANY_PEERS) {
                // hack
                this._peersQueue.push({
                    peer: {
                        id: peer.getId(),
                        address: peer._socket.remoteAddress,
                        tcpPort: peer._socket.remotePort,
                    },
                    ts: (Date.now() + 15000),
                });
            }
            const id = peer.getId();
            if (id) {
                const peerKey = id.toString('hex');
                this._peers.delete(peerKey);
                this.emit('peer:removed', peer, reason, disconnectWe);
            }
        });
    }
    _refillConnections() {
        if (!this._isAlive())
            return;
        if (this._refillIntervalSelectionCounter === 0) {
            debug(`Restart connection refill .. with selector ${this._refillIntervalSelectionCounter} peers: ${this._peers.size}, queue size: ${this._peersQueue.length}, open slots: ${this._getOpenSlots()}`);
        }
        // Rotating selection counter going in loop from 0..9
        this._refillIntervalSelectionCounter = (this._refillIntervalSelectionCounter + 1) % 10;
        this._peersQueue = this._peersQueue.filter((item) => {
            if (this._getOpenSlots() === 0)
                return true;
            if (item.ts > Date.now())
                return true;
            // Randomly distributed selector based on peer ID
            // to decide on subdivided execution
            const selector = util_1.buffer2int(item.peer.id.slice(0, 1)) % 10;
            if (selector === this._refillIntervalSelectionCounter) {
                this._connectToPeer(item.peer);
                return false;
            }
            else {
                // Still keep peer in queue
                return true;
            }
        });
    }
}
exports.RLPx = RLPx;
//# sourceMappingURL=rlpx.js.map