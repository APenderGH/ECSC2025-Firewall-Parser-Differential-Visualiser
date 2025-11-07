declare let FIREWALL_EXCEPTION_TRIGGERED: boolean;
interface Uint8Array {
    read(length: number): Uint8Array;
    pointer: number;
}
declare function findEndOfContentBytes(element: number, index: number, array: Uint8Array): boolean;
declare class ASN1BERTag {
    tagValue: Uint8Array;
    constructed: boolean;
    constructor(buffer: Uint8Array, isFirewallParser?: boolean);
    retrieveTag(buffer: Uint8Array, isFirewallParser: boolean): Uint8Array;
    isConstructed(): boolean;
}
declare class ASN1BERLength {
    lengthValue: number;
    lengthBytes: Uint8Array;
    constructor(buffer: Uint8Array, isConstructed: boolean, isFirewallParser?: boolean);
    retrieveLength(buffer: Uint8Array, isConstructed: boolean, isFirewallParser: boolean): [number, Uint8Array];
}
declare class ASN1BERValue {
    content: Uint8Array;
    constructor(buffer: Uint8Array, length: number);
    retrieveContent(buffer: Uint8Array, length: number): Uint8Array<ArrayBufferLike>;
}
declare class ASN1BER {
    tag: ASN1BERTag;
    length: ASN1BERLength;
    value: ASN1BERValue;
    children: ASN1BER[];
    constructor(buffer: Uint8Array, isFirewallParser?: boolean);
}
declare let GROUP_IDENTIFIER_COUNT: number;
declare let createByteHTML: (bytes: Uint8Array) => HTMLDivElement[];
declare let createTagHTML: (byteHTML: HTMLDivElement[]) => HTMLDivElement[];
declare let createLengthHTML: (byteHTML: HTMLDivElement[]) => HTMLDivElement[];
declare let createValueHTML: (byteHTML: HTMLDivElement[]) => HTMLDivElement[];
declare function highlightByteGroup(byte: HTMLDivElement): void;
declare function unhighlightBytes(parserDiv: HTMLDivElement): void;
declare function createASN1ByteHTML(asn1: ASN1BER): HTMLDivElement[];
declare function updateStandardASN1Visualiser(byteString: string): void;
declare function updateFirewallASN1Visualiser(byteString: string): void;
declare function updateVisualisers(byteString: string): void;
declare function setStandardInputExample(): void;
declare function setExploitInputExample(): void;
//# sourceMappingURL=main.d.ts.map