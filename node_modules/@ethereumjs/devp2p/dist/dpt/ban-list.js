"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BanList = void 0;
const lru_cache_1 = __importDefault(require("lru-cache"));
const debug_1 = require("debug");
const kbucket_1 = require("./kbucket");
const util_1 = require("../util");
const debug = debug_1.debug('devp2p:dpt:ban-list');
const verbose = debug_1.debug('verbose').enabled;
class BanList {
    constructor() {
        this.lru = new lru_cache_1.default({ max: 30000 }); // 10k should be enough (each peer obj can has 3 keys)
    }
    add(obj, maxAge) {
        for (const key of kbucket_1.KBucket.getKeys(obj)) {
            this.lru.set(key, true, maxAge);
            debug(`Added peer ${util_1.formatLogId(key, verbose)}, size: ${this.lru.length}`);
        }
    }
    has(obj) {
        return kbucket_1.KBucket.getKeys(obj).some((key) => Boolean(this.lru.get(key)));
    }
}
exports.BanList = BanList;
//# sourceMappingURL=ban-list.js.map