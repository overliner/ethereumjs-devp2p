"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tape_1 = __importDefault(require("tape"));
const dns_1 = __importDefault(require("../src/browser/dns"));
tape_1.default('dns browser polyfill stub', async (t) => {
    const expectedError = 'EIP-1459 DNS Discovery is not supported for browser environments';
    t.test('dns.promises.resolve throws an error', async (t) => {
        try {
            await dns_1.default.promises.resolve('www.hello.com', 'TXT');
        }
        catch (e) {
            t.ok(e.toString().includes(expectedError), 'throws expected error');
            t.end();
        }
    });
    t.test('dns.setServers throws and error', (t) => {
        try {
            dns_1.default.setServers(['8.8.8.8']);
        }
        catch (e) {
            t.ok(e.toString().includes(expectedError), 'throws expected error');
            t.end();
        }
    });
});
//# sourceMappingURL=browser.js.map