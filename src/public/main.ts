interface Uint8Array {
	read(length: number): Uint8Array;
	pointer: number;
}

Uint8Array.prototype.read = function (length: number = 1): Uint8Array {
	if (this.pointer === undefined || this.pointer === null) { this.pointer = 0 }
	if ((this.pointer + length) > this.length) { 
		throw new RangeError(`Attempted to read from ${this.pointer} to ${this.pointer + length}, but the buffer is of length ${this.length}`) 
	}

	let totalRead: number = this.pointer + length;
	let returnBuffer: Uint8Array = this.slice(this.pointer, totalRead);
	this.pointer = totalRead;
	return returnBuffer;
};

class ASN1BERTag {
	tagValue: Uint8Array;
	constructed: boolean;

	constructor(buffer: Uint8Array) {
		this.tagValue = this.retrieveTag(buffer);
		this.constructed = this.isConstructed();
	}

	retrieveTag(buffer: Uint8Array): Uint8Array {
		let firstOctet: number = buffer.read(1)[0]!
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

	isConstructed() {
		return (this.tagValue[0]! & 0x20) === 0x20;
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
	children: ASN1BER[] = [];

	constructor(buffer: Uint8Array) {
		this.tag = new ASN1BERTag(buffer);
		this.length = new ASN1BERLength(buffer);
		this.value = new ASN1BERValue(buffer, this.length.lengthValue);
		console.log(`Final pointer: ${buffer.pointer}`);
		//@ts-ignore
		console.log(`Tag: ${this.tag.tagValue.toHex()}`);
		//@ts-ignore
		console.log(`Length: ${this.length.lengthBytes.toHex()}`);
		//@ts-ignore
		console.log(`Value: ${this.value.content.toHex()}`);
		if (this.tag.constructed) {
			console.log("Processing constructed");
			let contentEnd: number = buffer.pointer;
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
let example: ASN1BER = new ASN1BER(Uint8Array.fromHex("30230201010481086669726577616c6ca1130201000201000201003008300606022a030500"));
console.log(example.tag, example.length, example.value);
console.log(example.tag.constructed)
