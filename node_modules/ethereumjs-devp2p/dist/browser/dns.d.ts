/**
 *  This is a browser polyfill stub which replaces the Node DNS module.
 *  DNS does not have a standard browser polyfill. Users who want to bundle
 *  devp2p for the browser can alias the `dns` module to @ethereumjs/devp2p/browser/dns
 *  and inject this stub. EIP-1459 DNS discovery is disabled by default and
 *  can be explicitly disabled by setting DPTOption `shouldGetDnsPeers` to `false`
 */
export default class dns {
    static promises: {
        resolve: (_url: string, _recordType: string) => Promise<any[]>;
    };
    static setServers(_servers: string[]): void;
}
