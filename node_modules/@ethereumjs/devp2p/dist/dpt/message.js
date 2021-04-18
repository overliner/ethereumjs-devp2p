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
exports.decode = exports.encode = void 0;
const debug_1 = require("debug");
const ip_1 = __importDefault(require("ip"));
const rlp = __importStar(require("rlp"));
const secp256k1_1 = __importDefault(require("secp256k1"));
const util_1 = require("../util");
const debug = debug_1.debug('devp2p:dpt:server');
function getTimestamp() {
    return (Date.now() / 1000) | 0;
}
const timestamp = {
    encode: function (value = getTimestamp() + 60) {
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeUInt32BE(value, 0);
        return buffer;
    },
    decode: function (buffer) {
        if (buffer.length !== 4)
            throw new RangeError(`Invalid timestamp buffer :${buffer.toString('hex')}`);
        return buffer.readUInt32BE(0);
    },
};
const address = {
    encode: function (value) {
        if (ip_1.default.isV4Format(value))
            return ip_1.default.toBuffer(value);
        if (ip_1.default.isV6Format(value))
            return ip_1.default.toBuffer(value);
        throw new Error(`Invalid address: ${value}`);
    },
    decode: function (buffer) {
        if (buffer.length === 4)
            return ip_1.default.toString(buffer);
        if (buffer.length === 16)
            return ip_1.default.toString(buffer);
        const str = buffer.toString();
        if (ip_1.default.isV4Format(str) || ip_1.default.isV6Format(str))
            return str;
        // also can be host, but skip it right now (because need async function for resolve)
        throw new Error(`Invalid address buffer: ${buffer.toString('hex')}`);
    },
};
const port = {
    encode: function (value) {
        if (value === null)
            return Buffer.allocUnsafe(0);
        if (value >>> 16 > 0)
            throw new RangeError(`Invalid port: ${value}`);
        return Buffer.from([(value >>> 8) & 0xff, (value >>> 0) & 0xff]);
    },
    decode: function (buffer) {
        if (buffer.length === 0)
            return null;
        // if (buffer.length !== 2) throw new RangeError(`Invalid port buffer: ${buffer.toString('hex')}`)
        return util_1.buffer2int(buffer);
    },
};
const endpoint = {
    encode: function (obj) {
        return [
            address.encode(obj.address),
            port.encode(obj.udpPort || null),
            port.encode(obj.tcpPort || null),
        ];
    },
    decode: function (payload) {
        return {
            address: address.decode(payload[0]),
            udpPort: port.decode(payload[1]),
            tcpPort: port.decode(payload[2]),
        };
    },
};
const ping = {
    encode: function (obj) {
        return [
            util_1.int2buffer(obj.version),
            endpoint.encode(obj.from),
            endpoint.encode(obj.to),
            timestamp.encode(obj.timestamp),
        ];
    },
    decode: function (payload) {
        return {
            version: util_1.buffer2int(payload[0]),
            from: endpoint.decode(payload[1]),
            to: endpoint.decode(payload[2]),
            timestamp: timestamp.decode(payload[3]),
        };
    },
};
const pong = {
    encode: function (obj) {
        return [endpoint.encode(obj.to), obj.hash, timestamp.encode(obj.timestamp)];
    },
    decode: function (payload) {
        return {
            to: endpoint.decode(payload[0]),
            hash: payload[1],
            timestamp: timestamp.decode(payload[2]),
        };
    },
};
const findneighbours = {
    encode: function (obj) {
        return [obj.id, timestamp.encode(obj.timestamp)];
    },
    decode: function (payload) {
        return {
            id: payload[0],
            timestamp: timestamp.decode(payload[1]),
        };
    },
};
const neighbours = {
    encode: function (obj) {
        return [
            obj.peers.map((peer) => endpoint.encode(peer).concat(peer.id)),
            timestamp.encode(obj.timestamp),
        ];
    },
    decode: function (payload) {
        return {
            peers: payload[0].map((data) => {
                return { endpoint: endpoint.decode(data), id: data[3] }; // hack for id
            }),
            timestamp: timestamp.decode(payload[1]),
        };
    },
};
const messages = { ping, pong, findneighbours, neighbours };
const types = {
    byName: {
        ping: 0x01,
        pong: 0x02,
        findneighbours: 0x03,
        neighbours: 0x04,
    },
    byType: {
        0x01: 'ping',
        0x02: 'pong',
        0x03: 'findneighbours',
        0x04: 'neighbours',
    },
};
// [0, 32) data hash
// [32, 96) signature
// 96 recoveryId
// 97 type
// [98, length) data
function encode(typename, data, privateKey) {
    const type = types.byName[typename];
    if (type === undefined)
        throw new Error(`Invalid typename: ${typename}`);
    const encodedMsg = messages[typename].encode(data);
    const typedata = Buffer.concat([Buffer.from([type]), rlp.encode(encodedMsg)]);
    const sighash = util_1.keccak256(typedata);
    const sig = secp256k1_1.default.ecdsaSign(sighash, privateKey);
    const hashdata = Buffer.concat([Buffer.from(sig.signature), Buffer.from([sig.recid]), typedata]);
    const hash = util_1.keccak256(hashdata);
    return Buffer.concat([hash, hashdata]);
}
exports.encode = encode;
function decode(buffer) {
    const hash = util_1.keccak256(buffer.slice(32));
    util_1.assertEq(buffer.slice(0, 32), hash, 'Hash verification failed', debug);
    const typedata = buffer.slice(97);
    const type = typedata[0];
    const typename = types.byType[type];
    if (typename === undefined)
        throw new Error(`Invalid type: ${type}`);
    const data = messages[typename].decode(util_1.unstrictDecode(typedata.slice(1)));
    const sighash = util_1.keccak256(typedata);
    const signature = buffer.slice(32, 96);
    const recoverId = buffer[96];
    const publicKey = Buffer.from(secp256k1_1.default.ecdsaRecover(signature, recoverId, sighash, false));
    return { typename, data, publicKey };
}
exports.decode = decode;
//# sourceMappingURL=message.js.map