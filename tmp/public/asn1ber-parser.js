Uint8Array.prototype.read = function (length = 1) {
    if (this.pointer === undefined || this.pointer === null) {
        this.pointer = 0;
    }
    if ((this.pointer + length) > this.length) {
        throw new RangeError(`Attempted to read from ${this.pointer} to ${this.pointer + length}, but the buffer is of length ${this.length}`);
    }
    let totalRead = this.pointer + length;
    let returnBuffer = this.slice(this.pointer, totalRead);
    this.pointer = totalRead;
    return returnBuffer;
};
function findEndOfContentBytes(element, index, array) {
    return (element === 0x00) && (array[index + 1] === 0x00);
}
class ASN1BERTag {
    tagValue;
    constructed;
    constructor(buffer) {
        this.tagValue = this.retrieveTag(buffer);
        this.constructed = this.isConstructed();
    }
    retrieveTag(buffer) {
        let firstOctet = buffer.read(1)[0];
        if ((firstOctet & 0x1F) === 0x1F) {
            console.log("Processing high-form tag");
            let octets = [firstOctet];
            while (true) {
                let octet = buffer.read(1)[0];
                octets = octets.concat(octet);
                if (!(octet & 0x80)) {
                    break;
                }
            }
            return Uint8Array.from(octets);
        }
        else {
            console.log("Processing low-form tag");
            return Uint8Array.from([firstOctet]);
        }
    }
    isConstructed() {
        return (this.tagValue[0] & 0x20) === 0x20;
    }
}
class ASN1BERLength {
    lengthValue;
    lengthBytes;
    constructor(buffer, isConstructed) {
        let lengthInfo = this.retrieveLength(buffer, isConstructed);
        this.lengthValue = lengthInfo[0];
        this.lengthBytes = lengthInfo[1];
    }
    retrieveLength(buffer, isConstructed) {
        let firstOctet = buffer.read(1)[0];
        if ((firstOctet === 0x80) && isConstructed) {
            console.log("Processing indefinite length");
            // We search the rest of the buffer for 0x00,0x00 (end of content)
            let contentSearchBuffer = buffer.slice(buffer.pointer, buffer.length);
            return [contentSearchBuffer.findIndex(findEndOfContentBytes), Uint8Array.from([firstOctet])];
        }
        else if ((firstOctet & 0x80)) {
            console.log("Processing long-form length");
            let octets = [firstOctet];
            let lengthLength = firstOctet ^ 0x80;
            for (let i = 0; i < lengthLength; i++) {
                let octet = buffer.read(1)[0];
                octets = octets.concat(octet);
            }
            let octetsBuffer = Uint8Array.from(octets);
            //@ts-ignore
            let length = parseInt(octetsBuffer.slice(1, octetsBuffer.length).toHex(), 16); // .toHex() not supported by TypeScript?
            return [length, octetsBuffer];
        }
        else {
            console.log("Processing short-form length");
            return [firstOctet, Uint8Array.from([firstOctet])];
        }
    }
}
class ASN1BERValue {
    content;
    constructor(buffer, length) {
        this.content = this.retrieveContent(buffer, length);
    }
    retrieveContent(buffer, length) {
        return buffer.read(length);
    }
}
export class ASN1BER {
    tag;
    length;
    value;
    children = [];
    constructor(buffer) {
        this.tag = new ASN1BERTag(buffer);
        this.length = new ASN1BERLength(buffer, this.tag.constructed);
        this.value = new ASN1BERValue(buffer, this.length.lengthValue);
        console.log(`Final pointer: ${buffer.pointer}`);
        //@ts-ignore
        console.log(`Tag: ${this.tag.tagValue.toHex()}`);
        //@ts-ignore
        console.log(`Length: ${this.length.lengthBytes.toHex()}`);
        //@ts-ignore
        console.log(`Value: ${this.value.content.toHex()}`);
        if (this.tag.constructed) {
            console.log("Processing constructed - definite-length");
            let contentEnd = buffer.pointer;
            buffer.pointer = buffer.pointer - this.length.lengthValue; // Reset pointer to beginning of value
            while (buffer.pointer < contentEnd) {
                this.children = this.children.concat(new ASN1BER(buffer));
                console.log("Added child");
                console.log(this.children);
            }
        }
    }
}
//@ts-ignore
let example = new ASN1BER(Uint8Array.fromHex("30230201010481086669726577616c6ca1130201000201000201003008300606022a030500"));
console.log(example.tag, example.length, example.value);
console.log(example.tag.constructed);
//# sourceMappingURL=asn1ber-parser.js.map