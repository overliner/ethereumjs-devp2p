"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KBucket = void 0;
const events_1 = require("events");
const _KBucket = require("k-bucket");
const KBUCKET_SIZE = 128;
const KBUCKET_CONCURRENCY = 8;
class KBucket extends events_1.EventEmitter {
    constructor(localNodeId) {
        super();
        this._peers = new Map();
        this._kbucket = new _KBucket({
            localNodeId,
            numberOfNodesPerKBucket: KBUCKET_SIZE,
            numberOfNodesToPing: KBUCKET_CONCURRENCY,
        });
        this._kbucket.on('added', (peer) => {
            KBucket.getKeys(peer).forEach((key) => this._peers.set(key, peer));
            this.emit('added', peer);
        });
        this._kbucket.on('removed', (peer) => {
            KBucket.getKeys(peer).forEach((key) => this._peers.delete(key));
            this.emit('removed', peer);
        });
        this._kbucket.on('ping', (oldPeers, newPeer) => {
            this.emit('ping', oldPeers, newPeer);
        });
    }
    static getKeys(obj) {
        if (Buffer.isBuffer(obj))
            return [obj.toString('hex')];
        if (typeof obj === 'string')
            return [obj];
        const keys = [];
        if (Buffer.isBuffer(obj.id))
            keys.push(obj.id.toString('hex'));
        if (obj.address && obj.tcpPort)
            keys.push(`${obj.address}:${obj.tcpPort}`);
        return keys;
    }
    add(peer) {
        const isExists = KBucket.getKeys(peer).some((key) => this._peers.has(key));
        if (!isExists)
            this._kbucket.add(peer);
    }
    get(obj) {
        for (const key of KBucket.getKeys(obj)) {
            const peer = this._peers.get(key);
            if (peer !== undefined)
                return peer;
        }
        return null;
    }
    getAll() {
        return this._kbucket.toArray();
    }
    closest(id) {
        return this._kbucket.closest(Buffer.from(id), KBUCKET_SIZE);
    }
    remove(obj) {
        const peer = this.get(obj);
        if (peer !== null)
            this._kbucket.remove(peer.id);
    }
}
exports.KBucket = KBucket;
//# sourceMappingURL=kbucket.js.map