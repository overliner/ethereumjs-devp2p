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
const crypto_1 = require("crypto");
const secp256k1 = __importStar(require("secp256k1"));
const tape_1 = __importDefault(require("tape"));
const util = __importStar(require("../src/util"));
const ecies_1 = require("../src/rlpx/ecies");
const testdata_json_1 = __importDefault(require("./testdata.json"));
function randomBefore(fn) {
    return (t) => {
        const privateKey1 = util.genPrivateKey();
        const privateKey2 = util.genPrivateKey();
        const publicKey1 = Buffer.from(secp256k1.publicKeyCreate(privateKey1, false));
        const publicKey2 = Buffer.from(secp256k1.publicKeyCreate(privateKey2, false));
        t.context = {
            a: new ecies_1.ECIES(privateKey1, util.pk2id(publicKey1), util.pk2id(publicKey2)),
            b: new ecies_1.ECIES(privateKey2, util.pk2id(publicKey2), util.pk2id(publicKey1)),
        };
        fn(t);
    };
}
function testdataBefore(fn) {
    return (t) => {
        const v = testdata_json_1.default.eip8Values;
        const keyA = Buffer.from(v.keyA, 'hex');
        const keyB = Buffer.from(v.keyB, 'hex');
        const pubA = Buffer.from(v.pubA, 'hex');
        const pubB = Buffer.from(v.pubB, 'hex');
        const h = testdata_json_1.default.eip8Handshakes;
        t.context = {
            a: new ecies_1.ECIES(keyA, util.pk2id(pubA), util.pk2id(pubB)),
            b: new ecies_1.ECIES(keyB, util.pk2id(pubB), util.pk2id(pubA)),
            h0: {
                auth: Buffer.from(h[0].auth.join(''), 'hex'),
                ack: Buffer.from(h[0].ack.join(''), 'hex'),
            },
            h1: {
                auth: Buffer.from(h[1].auth.join(''), 'hex'),
                ack: Buffer.from(h[1].ack.join(''), 'hex'),
            },
        };
        fn(t);
    };
}
tape_1.default('Random: message encryption', randomBefore((t) => {
    const message = Buffer.from('The Magic Words are Squeamish Ossifrage');
    const encrypted = t.context.a._encryptMessage(message);
    const decrypted = t.context.b._decryptMessage(encrypted);
    t.same(message, decrypted, 'encryptMessage -> decryptMessage should lead to same');
    t.end();
}));
tape_1.default('Random: auth -> ack -> header -> body (old format/no EIP8)', randomBefore((t) => {
    t.doesNotThrow(() => {
        const auth = t.context.a.createAuthNonEIP8();
        t.context.b._gotEIP8Auth = false;
        t.context.b.parseAuthPlain(auth);
    }, 'should not throw on auth creation/parsing');
    t.doesNotThrow(() => {
        t.context.b._gotEIP8Ack = false;
        const ack = t.context.b.createAckOld();
        t.context.a.parseAckPlain(ack);
    }, 'should not throw on ack creation/parsing');
    const body = crypto_1.randomBytes(600);
    const header = t.context.b.parseHeader(t.context.a.createHeader(body.length));
    t.same(header, body.length, 'createHeader -> parseHeader should lead to same');
    const parsedBody = t.context.b.parseBody(t.context.a.createBody(body));
    t.same(parsedBody, body, 'createBody -> parseBody should lead to same');
    t.end();
}));
tape_1.default('Random: auth -> ack (EIP8)', randomBefore((t) => {
    t.doesNotThrow(() => {
        const auth = t.context.a.createAuthEIP8();
        t.context.b._gotEIP8Auth = true;
        t.context.b.parseAuthEIP8(auth);
    }, 'should not throw on auth creation/parsing');
    t.doesNotThrow(() => {
        const ack = t.context.b.createAckEIP8();
        t.context.a._gotEIP8Ack = true;
        t.context.a.parseAckEIP8(ack);
    }, 'should not throw on ack creation/parsing');
    t.end();
}));
tape_1.default('Testdata: auth -> ack (old format/no EIP8)', testdataBefore((t) => {
    t.doesNotThrow(() => {
        t.context.b._gotEIP8Auth = false;
        t.context.b.parseAuthPlain(t.context.h0.auth);
        t.context.a._initMsg = t.context.h0.auth;
    }, 'should not throw on auth parsing');
    t.doesNotThrow(() => {
        t.context.a._gotEIP8Ack = false;
        t.context.a.parseAckPlain(t.context.h0.ack);
    }, 'should not throw on ack parsing');
    t.end();
}));
tape_1.default('Testdata: auth -> ack (EIP8)', testdataBefore((t) => {
    t.doesNotThrow(() => {
        t.context.b._gotEIP8Auth = true;
        t.context.b.parseAuthEIP8(t.context.h1.auth);
        t.context.a._initMsg = t.context.h1.auth;
    }, 'should not throw on auth parsing');
    t.doesNotThrow(() => {
        t.context.a._gotEIP8Ack = true;
        t.context.a.parseAckEIP8(t.context.h1.ack);
    }, 'should not throw on ack parsing');
    t.end();
}));
//# sourceMappingURL=rlpx-ecies.js.map