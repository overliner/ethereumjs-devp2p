"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAC = void 0;
const crypto_1 = require("crypto");
const keccak_1 = __importDefault(require("keccak"));
const util_1 = require("../util");
class MAC {
    constructor(secret) {
        this._hash = keccak_1.default('keccak256');
        this._secret = secret;
    }
    update(data) {
        this._hash.update(data);
    }
    updateHeader(data) {
        const aes = crypto_1.createCipheriv('aes-256-ecb', this._secret, '');
        const encrypted = aes.update(this.digest());
        this._hash.update(util_1.xor(encrypted, data));
    }
    updateBody(data) {
        this._hash.update(data);
        const prev = this.digest();
        const aes = crypto_1.createCipheriv('aes-256-ecb', this._secret, '');
        const encrypted = aes.update(prev);
        this._hash.update(util_1.xor(encrypted, prev));
    }
    digest() {
        return this._hash._clone().digest().slice(0, 16);
    }
}
exports.MAC = MAC;
//# sourceMappingURL=mac.js.map