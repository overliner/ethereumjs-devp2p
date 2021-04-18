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
exports.Peer = exports.DISCONNECT_REASONS = exports.PREFIXES = exports.PING_INTERVAL = exports.BASE_PROTOCOL_LENGTH = exports.BASE_PROTOCOL_VERSION = void 0;
const events_1 = require("events");
const rlp = __importStar(require("rlp"));
const util = __importStar(require("../util"));
const BufferList = require("bl");
const ms_1 = __importDefault(require("ms"));
const debug_1 = require("debug");
const ecies_1 = require("./ecies");
const util_1 = require("../util");
const debug = debug_1.debug('devp2p:rlpx:peer');
const verbose = debug_1.debug('verbose').enabled;
exports.BASE_PROTOCOL_VERSION = 4;
exports.BASE_PROTOCOL_LENGTH = 16;
exports.PING_INTERVAL = ms_1.default('15s');
var PREFIXES;
(function (PREFIXES) {
    PREFIXES[PREFIXES["HELLO"] = 0] = "HELLO";
    PREFIXES[PREFIXES["DISCONNECT"] = 1] = "DISCONNECT";
    PREFIXES[PREFIXES["PING"] = 2] = "PING";
    PREFIXES[PREFIXES["PONG"] = 3] = "PONG";
})(PREFIXES = exports.PREFIXES || (exports.PREFIXES = {}));
var DISCONNECT_REASONS;
(function (DISCONNECT_REASONS) {
    DISCONNECT_REASONS[DISCONNECT_REASONS["DISCONNECT_REQUESTED"] = 0] = "DISCONNECT_REQUESTED";
    DISCONNECT_REASONS[DISCONNECT_REASONS["NETWORK_ERROR"] = 1] = "NETWORK_ERROR";
    DISCONNECT_REASONS[DISCONNECT_REASONS["PROTOCOL_ERROR"] = 2] = "PROTOCOL_ERROR";
    DISCONNECT_REASONS[DISCONNECT_REASONS["USELESS_PEER"] = 3] = "USELESS_PEER";
    DISCONNECT_REASONS[DISCONNECT_REASONS["TOO_MANY_PEERS"] = 4] = "TOO_MANY_PEERS";
    DISCONNECT_REASONS[DISCONNECT_REASONS["ALREADY_CONNECTED"] = 5] = "ALREADY_CONNECTED";
    DISCONNECT_REASONS[DISCONNECT_REASONS["INCOMPATIBLE_VERSION"] = 6] = "INCOMPATIBLE_VERSION";
    DISCONNECT_REASONS[DISCONNECT_REASONS["INVALID_IDENTITY"] = 7] = "INVALID_IDENTITY";
    DISCONNECT_REASONS[DISCONNECT_REASONS["CLIENT_QUITTING"] = 8] = "CLIENT_QUITTING";
    DISCONNECT_REASONS[DISCONNECT_REASONS["UNEXPECTED_IDENTITY"] = 9] = "UNEXPECTED_IDENTITY";
    DISCONNECT_REASONS[DISCONNECT_REASONS["SAME_IDENTITY"] = 10] = "SAME_IDENTITY";
    DISCONNECT_REASONS[DISCONNECT_REASONS["TIMEOUT"] = 11] = "TIMEOUT";
    DISCONNECT_REASONS[DISCONNECT_REASONS["SUBPROTOCOL_ERROR"] = 16] = "SUBPROTOCOL_ERROR";
})(DISCONNECT_REASONS = exports.DISCONNECT_REASONS || (exports.DISCONNECT_REASONS = {}));
class Peer extends events_1.EventEmitter {
    constructor(options) {
        super();
        // hello data
        this._clientId = options.clientId;
        this._capabilities = options.capabilities;
        this._common = options.common;
        this._port = options.port;
        this._id = options.id;
        this._remoteClientIdFilter = options.remoteClientIdFilter;
        // ECIES session
        this._remoteId = options.remoteId;
        this._EIP8 = options.EIP8 !== undefined ? options.EIP8 : true;
        this._eciesSession = new ecies_1.ECIES(options.privateKey, this._id, this._remoteId);
        // Auth, Ack, Header, Body
        this._state = 'Auth';
        this._weHello = null;
        this._hello = null;
        this._nextPacketSize = 307;
        // socket
        this._socket = options.socket;
        this._socketData = new BufferList();
        this._socket.on('data', this._onSocketData.bind(this));
        this._socket.on('error', (err) => this.emit('error', err));
        this._socket.once('close', this._onSocketClose.bind(this));
        this._connected = false;
        this._closed = false;
        this._disconnectWe = null;
        this._pingIntervalId = null;
        this._pingTimeout = options.timeout;
        this._pingTimeoutId = null;
        // sub-protocols
        this._protocols = [];
        // send AUTH if outgoing connection
        if (this._remoteId !== null) {
            this._sendAuth();
        }
    }
    /**
     * Send AUTH message
     */
    _sendAuth() {
        if (this._closed)
            return;
        debug(`Send auth (EIP8: ${this._EIP8}) to ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        if (this._EIP8) {
            const authEIP8 = this._eciesSession.createAuthEIP8();
            if (!authEIP8)
                return;
            this._socket.write(authEIP8);
        }
        else {
            const authNonEIP8 = this._eciesSession.createAuthNonEIP8();
            if (!authNonEIP8)
                return;
            this._socket.write(authNonEIP8);
        }
        this._state = 'Ack';
        this._nextPacketSize = 210;
    }
    /**
     * Send ACK message
     */
    _sendAck() {
        if (this._closed)
            return;
        debug(`Send ack (EIP8: ${this._eciesSession._gotEIP8Auth}) to ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        if (this._eciesSession._gotEIP8Auth) {
            const ackEIP8 = this._eciesSession.createAckEIP8();
            if (!ackEIP8)
                return;
            this._socket.write(ackEIP8);
        }
        else {
            const ackOld = this._eciesSession.createAckOld();
            if (!ackOld)
                return;
            this._socket.write(ackOld);
        }
        this._state = 'Header';
        this._nextPacketSize = 32;
        this._sendHello();
    }
    /**
     * Create message HEADER and BODY and send to socket
     * Also called from SubProtocol context
     * @param code
     * @param data
     */
    _sendMessage(code, data) {
        if (this._closed)
            return false;
        const msg = Buffer.concat([rlp.encode(code), data]);
        const header = this._eciesSession.createHeader(msg.length);
        if (!header || this._socket.destroyed)
            return;
        this._socket.write(header);
        const body = this._eciesSession.createBody(msg);
        // this._socket.destroyed added here and above to safeguard against
        // occasional "Cannot call write after a stream was destroyed" errors.
        // Eventually this can be caught earlier down the line.
        if (!body || this._socket.destroyed)
            return;
        this._socket.write(body);
        return true;
    }
    /**
     * Send HELLO message
     */
    _sendHello() {
        debug(`Send HELLO to ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        const payload = [
            util_1.int2buffer(exports.BASE_PROTOCOL_VERSION),
            this._clientId,
            this._capabilities.map((obj) => [Buffer.from(obj.name), util_1.int2buffer(obj.version)]),
            this._port === null ? Buffer.allocUnsafe(0) : util_1.int2buffer(this._port),
            this._id,
        ];
        if (!this._closed) {
            if (this._sendMessage(PREFIXES.HELLO, rlp.encode(payload))) {
                this._weHello = payload;
            }
            if (this._hello) {
                this.emit('connect');
            }
        }
    }
    /**
     * Send DISCONNECT message
     * @param reason
     */
    _sendDisconnect(reason) {
        debug(`Send DISCONNECT to ${this._socket.remoteAddress}:${this._socket.remotePort} (reason: ${this.getDisconnectPrefix(reason)})`);
        const data = rlp.encode(reason);
        if (!this._sendMessage(PREFIXES.DISCONNECT, data))
            return;
        this._disconnectReason = reason;
        this._disconnectWe = true;
        this._closed = true;
        setTimeout(() => this._socket.end(), ms_1.default('2s'));
    }
    /**
     * Send PING message
     */
    _sendPing() {
        debug(`Send PING to ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        const data = rlp.encode([]);
        if (!this._sendMessage(PREFIXES.PING, data))
            return;
        clearTimeout(this._pingTimeoutId);
        this._pingTimeoutId = setTimeout(() => {
            this.disconnect(DISCONNECT_REASONS.TIMEOUT);
        }, this._pingTimeout);
    }
    /**
     * Send PONG message
     */
    _sendPong() {
        debug(`Send PONG to ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        const data = rlp.encode([]);
        this._sendMessage(PREFIXES.PONG, data);
    }
    /**
     * AUTH message received
     */
    _handleAuth() {
        const bytesCount = this._nextPacketSize;
        const parseData = this._socketData.slice(0, bytesCount);
        if (!this._eciesSession._gotEIP8Auth) {
            if (parseData.slice(0, 1) === Buffer.from('04', 'hex')) {
                this._eciesSession.parseAuthPlain(parseData);
            }
            else {
                this._eciesSession._gotEIP8Auth = true;
                this._nextPacketSize = util.buffer2int(this._socketData.slice(0, 2)) + 2;
                return;
            }
        }
        else {
            this._eciesSession.parseAuthEIP8(parseData);
        }
        this._state = 'Header';
        this._nextPacketSize = 32;
        process.nextTick(() => this._sendAck());
        this._socketData.consume(bytesCount);
    }
    /**
     * ACK message received
     */
    _handleAck() {
        const bytesCount = this._nextPacketSize;
        const parseData = this._socketData.slice(0, bytesCount);
        if (!this._eciesSession._gotEIP8Ack) {
            if (parseData.slice(0, 1) === Buffer.from('04', 'hex')) {
                this._eciesSession.parseAckPlain(parseData);
                debug(`Received ack (old format) from ${this._socket.remoteAddress}:${this._socket.remotePort}`);
            }
            else {
                this._eciesSession._gotEIP8Ack = true;
                this._nextPacketSize = util.buffer2int(this._socketData.slice(0, 2)) + 2;
                return;
            }
        }
        else {
            this._eciesSession.parseAckEIP8(parseData);
            debug(`Received ack (EIP8) from ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        }
        this._state = 'Header';
        this._nextPacketSize = 32;
        process.nextTick(() => this._sendHello());
        this._socketData.consume(bytesCount);
    }
    /**
     * HELLO message received
     */
    _handleHello(payload) {
        this._hello = {
            protocolVersion: util_1.buffer2int(payload[0]),
            clientId: payload[1].toString(),
            capabilities: payload[2].map((item) => {
                return { name: item[0].toString(), version: util_1.buffer2int(item[1]) };
            }),
            port: util_1.buffer2int(payload[3]),
            id: payload[4],
        };
        if (this._remoteId === null) {
            this._remoteId = Buffer.from(this._hello.id);
        }
        else if (!this._remoteId.equals(this._hello.id)) {
            return this.disconnect(DISCONNECT_REASONS.INVALID_IDENTITY);
        }
        if (this._remoteClientIdFilter) {
            for (const filterStr of this._remoteClientIdFilter) {
                if (this._hello.clientId.toLowerCase().includes(filterStr.toLowerCase())) {
                    return this.disconnect(DISCONNECT_REASONS.USELESS_PEER);
                }
            }
        }
        const shared = {};
        for (const item of this._hello.capabilities) {
            for (const obj of this._capabilities) {
                if (obj.name !== item.name || obj.version !== item.version)
                    continue;
                if (shared[obj.name] && shared[obj.name].version > obj.version)
                    continue;
                shared[obj.name] = obj;
            }
        }
        let offset = exports.BASE_PROTOCOL_LENGTH;
        this._protocols = Object.keys(shared)
            .map((key) => shared[key])
            .sort((obj1, obj2) => (obj1.name < obj2.name ? -1 : 1))
            .map((obj) => {
            const _offset = offset;
            offset += obj.length;
            const SubProtocol = obj.constructor;
            const protocol = new SubProtocol(obj.version, this, (code, data) => {
                if (code > obj.length)
                    throw new Error('Code out of range');
                this._sendMessage(_offset + code, data);
            });
            return { protocol, offset: _offset, length: obj.length };
        });
        if (this._protocols.length === 0) {
            return this.disconnect(DISCONNECT_REASONS.USELESS_PEER);
        }
        this._connected = true;
        this._pingIntervalId = setInterval(() => this._sendPing(), exports.PING_INTERVAL);
        if (this._weHello) {
            this.emit('connect');
        }
    }
    /**
     * DISCONNECT message received
     * @param payload
     */
    _handleDisconnect(payload) {
        this._closed = true;
        this._disconnectReason = payload[0].length === 0 ? 0 : payload[0][0];
        debug(`DISCONNECT reason: ${DISCONNECT_REASONS[this._disconnectReason]} ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        this._disconnectWe = false;
        this._socket.end();
    }
    /**
     * PING message received
     */
    _handlePing() {
        this._sendPong();
    }
    /**
     * PONG message received
     */
    _handlePong() {
        clearTimeout(this._pingTimeoutId);
    }
    /**
     * Message handling, called from a SubProtocol context
     * @param code
     * @param msg
     */
    _handleMessage(code, msg) {
        const payload = rlp.decode(msg);
        switch (code) {
            case PREFIXES.HELLO:
                this._handleHello(payload);
                break;
            case PREFIXES.DISCONNECT:
                this._handleDisconnect(payload);
                break;
            case PREFIXES.PING:
                this._handlePing();
                break;
            case PREFIXES.PONG:
                this._handlePong();
                break;
        }
    }
    /**
     * Handle message header
     */
    _handleHeader() {
        const bytesCount = this._nextPacketSize;
        const parseData = this._socketData.slice(0, bytesCount);
        debug(`Received header ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        const size = this._eciesSession.parseHeader(parseData);
        if (!size) {
            debug('invalid header size!');
            return;
        }
        this._state = 'Body';
        this._nextPacketSize = size + 16;
        if (size % 16 > 0)
            this._nextPacketSize += 16 - (size % 16);
        this._socketData.consume(bytesCount);
    }
    /**
     * Handle message body
     */
    _handleBody() {
        const bytesCount = this._nextPacketSize;
        const parseData = this._socketData.slice(0, bytesCount);
        const body = this._eciesSession.parseBody(parseData);
        if (!body) {
            debug('empty body!');
            return;
        }
        debug(`Received body ${this._socket.remoteAddress}:${this._socket.remotePort} ${util_1.formatLogData(body.toString('hex'), verbose)}`);
        this._state = 'Header';
        this._nextPacketSize = 32;
        // RLP hack
        let code = body[0];
        if (code === 0x80)
            code = 0;
        if (code !== PREFIXES.HELLO && code !== PREFIXES.DISCONNECT && this._hello === null) {
            return this.disconnect(DISCONNECT_REASONS.PROTOCOL_ERROR);
        }
        const obj = this._getProtocol(code);
        if (obj === undefined)
            return this.disconnect(DISCONNECT_REASONS.PROTOCOL_ERROR);
        const msgCode = code - obj.offset;
        const prefix = this.getMsgPrefix(msgCode);
        debug(`Received ${prefix} (message code: ${code} - ${obj.offset} = ${msgCode}) ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        try {
            obj.protocol._handleMessage(msgCode, body.slice(1));
        }
        catch (err) {
            this.disconnect(DISCONNECT_REASONS.SUBPROTOCOL_ERROR);
            debug(`Error on peer subprotocol message handling: ${err}`);
            this.emit('error', err);
        }
        this._socketData.consume(bytesCount);
    }
    /**
     * Process socket data
     * @param data
     */
    _onSocketData(data) {
        if (this._closed)
            return;
        this._socketData.append(data);
        try {
            while (this._socketData.length >= this._nextPacketSize) {
                switch (this._state) {
                    case 'Auth':
                        this._handleAuth();
                        break;
                    case 'Ack':
                        this._handleAck();
                        break;
                    case 'Header':
                        this._handleHeader();
                        break;
                    case 'Body':
                        this._handleBody();
                        break;
                }
            }
        }
        catch (err) {
            this.disconnect(DISCONNECT_REASONS.SUBPROTOCOL_ERROR);
            debug(`Error on peer socket data handling: ${err}`);
            this.emit('error', err);
        }
    }
    /**
     * React to socket being closed
     */
    _onSocketClose() {
        clearInterval(this._pingIntervalId);
        clearTimeout(this._pingTimeoutId);
        this._closed = true;
        if (this._connected)
            this.emit('close', this._disconnectReason, this._disconnectWe);
    }
    _getProtocol(code) {
        if (code < exports.BASE_PROTOCOL_LENGTH)
            return { protocol: this, offset: 0 };
        for (const obj of this._protocols) {
            if (code >= obj.offset && code < obj.offset + obj.length)
                return obj;
        }
    }
    getId() {
        if (this._remoteId === null)
            return null;
        return Buffer.from(this._remoteId);
    }
    getHelloMessage() {
        return this._hello;
    }
    getProtocols() {
        return this._protocols.map((obj) => obj.protocol);
    }
    getMsgPrefix(code) {
        return PREFIXES[code];
    }
    getDisconnectPrefix(code) {
        return DISCONNECT_REASONS[code];
    }
    disconnect(reason = DISCONNECT_REASONS.DISCONNECT_REQUESTED) {
        this._sendDisconnect(reason);
    }
}
exports.Peer = Peer;
//# sourceMappingURL=peer.js.map