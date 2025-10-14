interface Uint8Array {
	read(length: number): Uint8Array;
	pointer: number;
}

const buffer: ArrayBuffer = new ArrayBuffer(16);
const bufferView: Uint8Array = new Uint8Array(buffer);

for (let i = 0; i < bufferView.length; i++) {
	bufferView[i] = i*2;
	console.log(bufferView[i]);
}

Uint8Array.prototype.read = function (length: number = 1): Uint8Array {
	if (this.pointer === undefined || this.pointer === null) { this.pointer = 0 }
	if ((this.pointer + length) > this.length) { 
		throw new RangeError(`Attempted to read from ${this.pointer} to ${this.pointer + length}, but the buffer is of length ${this.length}`) 
	}

	let returnBuffer: Uint8Array = this.slice(this.pointer, this.pointer + length);
	this.pointer++;
	return returnBuffer;
};

console.log(bufferView.read(1))
console.log(bufferView.read(1))
console.log(bufferView.read(1))
console.log(bufferView.read(1))


class ASN1BERTag {
	tagValue: Uint8Array;

	constructor(buffer: Uint8Array) {
		this.tagValue = this.retrieveTag(buffer);
	}

	retrieveTag(buffer: Uint8Array): Uint8Array {
		let firstOctet: number = buffer.read(1)[0]!;
		if ((firstOctet & 0x1F) === 0x1F) {
			console.log("Processing high-form tag");
			let octets = [firstOctet];
			while (true) {
				let octet: number = buffer.read(1)[0]!;
				octets = octets.concat(octet);
				if (!(octet & 0x80)) { break }
			}
			return Uint8Array.from(octets);
		} else {
			console.log("Processing low-form tag");
			return Uint8Array.from([firstOctet]);
		}
	}
}

class ASN1BERLength {
	lengthValue: number;
	lengthBytes: Uint8Array;

	constructor(buffer: Uint8Array) {
		let lengthInfo: [number, Uint8Array] = this.retrieveLength(buffer);
		this.lengthValue = lengthInfo[0];
		this.lengthBytes = lengthInfo[1];
	}

	retrieveLength(buffer: Uint8Array): [number, Uint8Array] {
		let firstOctet: number = buffer.read(1)[0]!;
		if ((firstOctet & 0x80)) {
			console.log("Processing long-form length");
			let octets = [firstOctet];
			let lengthLength: number = firstOctet ^ 0x80;
			for (let i = 0; i < lengthLength; i++) {
				let octet: number = buffer.read(1)[0]!;
				octets = octets.concat(octet);
			}
			let octetsBuffer: Uint8Array = Uint8Array.from(octets);
			//@ts-ignore
			let length: number = parseInt(octetsBuffer.slice(1, octetsBuffer.length).toHex(), 16); // .toHex() not supported by TypeScript?
			return [length, octetsBuffer];
		} else {
			console.log("Processing short-form length");
			return [firstOctet, Uint8Array.from([firstOctet])];
		}
	}
}

class ASN1BERValue {
	content: Uint8Array;

	constructor(buffer: Uint8Array, length: number) {
		this.content = this.retrieveContent(buffer, length);
	}

	retrieveContent(buffer: Uint8Array, length: number) {
		return buffer.read(length);
	}
}

class ASN1BER {
	tag: ASN1BERTag;
	length: ASN1BERLength;
	value: ASN1BERValue;

	constructor(buffer: Uint8Array) {
		this.tag = new ASN1BERTag(buffer);
		this.length = new ASN1BERLength(buffer);
		this.value = new ASN1BERValue(buffer, this.length.lengthValue);
	}
}

//@ts-ignore
let example: ASN1BER = new ASN1BER(Uint8Array.fromHex("30230201010481086669726577616c6ca1130201000201000201003008300606022a030500"));
console.log(example.tag, example.length, example.value);
