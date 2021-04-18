"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tape_1 = __importDefault(require("tape"));
const mac_1 = require("../src/rlpx/mac");
const secret = Buffer.from('4caf4671e713d083128973de159d02688dc86f51535a80178264631e193ed2ea', 'hex');
tape_1.default('digest should work on empty data', (t) => {
    const mac = new mac_1.MAC(secret);
    t.equal(mac.digest().toString('hex'), 'c5d2460186f7233c927e7db2dcc703c0');
    t.end();
});
tape_1.default('#update', (t) => {
    const mac = new mac_1.MAC(secret);
    mac.update('test');
    t.equal(mac.digest().toString('hex'), '9c22ff5f21f0b81b113e63f7db6da94f');
    t.end();
});
tape_1.default('#updateHeader', (t) => {
    const mac = new mac_1.MAC(secret);
    mac.updateHeader('this is a header data struct');
    t.equal(mac.digest().toString('hex'), '52235ed491a4c9224d94788762ead6a6');
    t.end();
});
tape_1.default('#updateBody', (t) => {
    const mac = new mac_1.MAC(secret);
    mac.updateBody('this is a body data struct');
    t.equal(mac.digest().toString('hex'), '134a755450b1ed9d3ff90ef5dcecdd7d');
    t.end();
});
tape_1.default('#updateHeader and #updateBody', (t) => {
    const mac = new mac_1.MAC(secret);
    mac.updateHeader('this is a header data struct');
    mac.updateBody('this is a body data struct');
    t.equal(mac.digest().toString('hex'), '5d98967578ec8edbb45e1d75992f394c');
    t.end();
});
//# sourceMappingURL=rlpx-mac.js.map