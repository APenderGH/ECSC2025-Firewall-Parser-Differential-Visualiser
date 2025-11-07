interface Uint8Array {
    read(length: number): Uint8Array;
    pointer: number;
}
declare class ASN1BERTag {
    tagValue: Uint8Array;
    constructed: boolean;
    constructor(buffer: Uint8Array);
    retrieveTag(buffer: Uint8Array): Uint8Array;
    isConstructed(): boolean;
}
declare class ASN1BERLength {
    lengthValue: number;
    lengthBytes: Uint8Array;
    constructor(buffer: Uint8Array, isConstructed: boolean);
    retrieveLength(buffer: Uint8Array, isConstructed: boolean): [number, Uint8Array];
}
declare class ASN1BERValue {
    content: Uint8Array;
    constructor(buffer: Uint8Array, length: number);
    retrieveContent(buffer: Uint8Array, length: number): Uint8Array;
}
export declare class ASN1BER {
    tag: ASN1BERTag;
    length: ASN1BERLength;
    value: ASN1BERValue;
    children: ASN1BER[];
    constructor(buffer: Uint8Array);
}
export {};
//# sourceMappingURL=asn1ber-parser.d.ts.map