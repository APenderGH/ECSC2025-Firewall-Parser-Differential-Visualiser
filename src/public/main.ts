// PARSER //
let FIREWALL_EXCEPTION_TRIGGERED: boolean = false;

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

function findEndOfContentBytes(element: number, index: number, array: Uint8Array): boolean {
	return (element === 0x00) && (array[index+1] === 0x00)
}

class ASN1BERTag {
	tagValue: Uint8Array;
	constructed: boolean;

	constructor(buffer: Uint8Array, isFirewallParser: boolean = false) {
		this.tagValue = this.retrieveTag(buffer, isFirewallParser);
		this.constructed = this.isConstructed();
	}

	retrieveTag(buffer: Uint8Array, isFirewallParser: boolean): Uint8Array {
		let firstOctet: number = buffer.read(1)[0]!
		if (((firstOctet & 0x1F) === 0x1F) && !isFirewallParser) {
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

	constructor(buffer: Uint8Array, isConstructed: boolean, isFirewallParser: boolean = false) {
		let lengthInfo: [number, Uint8Array] = this.retrieveLength(buffer, isConstructed, isFirewallParser);
		this.lengthValue = lengthInfo[0];
		this.lengthBytes = lengthInfo[1];
	}

	retrieveLength(buffer: Uint8Array, isConstructed: boolean, isFirewallParser: boolean): [number, Uint8Array] {
		let firstOctet: number = buffer.read(1)[0]!;
		if ((firstOctet === 0x80) && isConstructed && !isFirewallParser) {
			console.log("Processing indefinite length");
			// We search the rest of the buffer for 0x00,0x00 (end of content)
			let contentSearchBuffer: Uint8Array = buffer.slice(buffer.pointer, buffer.length);
			return [contentSearchBuffer.findIndex(findEndOfContentBytes), Uint8Array.from([firstOctet])];
		} else if ((firstOctet & 0x80) && !isFirewallParser) {
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

	constructor(buffer: Uint8Array, isFirewallParser: boolean = false) {
		this.tag = new ASN1BERTag(buffer, isFirewallParser);
		this.length = new ASN1BERLength(buffer, this.tag.constructed, isFirewallParser);
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
			let contentEnd: number = buffer.pointer;
			buffer.pointer = buffer.pointer - this.length.lengthValue; // Reset pointer to beginning of value
			// Note that we have a special case with the Firewall parser where it will always try to get three children from the top most object as it searches for the PDU
			while (buffer.pointer < contentEnd) {
				this.children = this.children.concat(new ASN1BER(buffer, isFirewallParser));
				console.log("Added child");
				console.log(this.children);
			}

			if (isFirewallParser && !FIREWALL_EXCEPTION_TRIGGERED && !(this.children.length >= 3)) {
				FIREWALL_EXCEPTION_TRIGGERED = true;
				this.children = this.children.concat(new ASN1BER(buffer, isFirewallParser));
				console.log("Added child with firewall parser exception");
				console.log(this.children);
			}
		}
	}
}

// RENDERING //

let GROUP_IDENTIFIER_COUNT: number = 1;

let createByteHTML: (bytes: Uint8Array) => HTMLDivElement[] = (bytes: Uint8Array) => {
	let bytesHTML: HTMLDivElement[] = [];
	bytes.forEach((byte) => {
		let byteHTML: HTMLDivElement = document.createElement("div");
		byteHTML.classList.add("px-1");
		byteHTML.textContent = byte.toString(16).padStart(2,"0");
		bytesHTML = bytesHTML.concat(byteHTML);
	});
	return bytesHTML;
}

let createTagHTML: (byteHTML: HTMLDivElement[]) => HTMLDivElement[] = (byteHTML: HTMLDivElement[]) => { 
	let tagHTML: HTMLDivElement[] = [];
	byteHTML.forEach((byte) => {
		byte.classList.add("text-(--color-orange)");
		tagHTML = tagHTML.concat(byte);
	});
	return tagHTML;
};

let createLengthHTML: (byteHTML: HTMLDivElement[]) => HTMLDivElement[] = (byteHTML: HTMLDivElement[]) => { 
	let lengthHTML: HTMLDivElement[] = [];
	byteHTML.forEach((byte) => {
		byte.classList.add("text-(--color-blue)");
		lengthHTML = lengthHTML.concat(byte);
	});
	return lengthHTML;
}

let createValueHTML: (byteHTML: HTMLDivElement[]) => HTMLDivElement[] = (byteHTML: HTMLDivElement[]) => { 
	let valueHTML: HTMLDivElement[] = [];
	byteHTML.forEach((byte) => {
		// We don't have any value specific styling atm.
		valueHTML = valueHTML.concat(byte);
	});
	return valueHTML;
}

function highlightByteGroup(byte: HTMLDivElement) {
	let classList: DOMTokenList = byte.classList;
	let highestByteGroup: number = 1;
	classList.forEach((className) => {
		let byteGroupString: string | undefined = className.split("bytegroup-")[1];
		if (byteGroupString === undefined) { return; }

		let byteGroup: number = parseInt(byteGroupString);
		if (byteGroup > highestByteGroup) {
			highestByteGroup = byteGroup;
		}
	});

	let bytesToHighlight: HTMLCollection = document.getElementsByClassName(`bytegroup-${highestByteGroup}`);
	for (let i = 0; i < bytesToHighlight.length; i++) {
		bytesToHighlight[i]!.classList.add("bg-(--color-highlight)");
	}
}

function unhighlightBytes(parserDiv: HTMLDivElement) {
	let bytes: HTMLCollection = parserDiv.children;
	for (let i = 0; i < bytes.length; i++) {
		bytes[i]!.classList.remove("bg-(--color-highlight)");
	}
}

function createASN1ByteHTML(asn1: ASN1BER) {
	let groupIdentifier = GROUP_IDENTIFIER_COUNT;
	let tagHTML: HTMLDivElement[] = createTagHTML(createByteHTML(asn1.tag.tagValue));
	let lengthHTML: HTMLDivElement[] = createLengthHTML(createByteHTML(asn1.length.lengthBytes));
	let valueHTML: HTMLDivElement[] = [];

	if (asn1.children.length != 0)  {
		asn1.children.forEach((child, index) => {
			GROUP_IDENTIFIER_COUNT = groupIdentifier + index + 1;
			valueHTML = valueHTML.concat(createASN1ByteHTML(child));
		});
	} else {
		valueHTML = createValueHTML(createByteHTML(asn1.value.content));
		GROUP_IDENTIFIER_COUNT++;
	}

	let ASN1ByteHTML: HTMLDivElement[] = ([] as HTMLDivElement[]).concat(tagHTML, lengthHTML, valueHTML);
	ASN1ByteHTML.forEach((element) => {
		element.classList.add(`bytegroup-${groupIdentifier}`);
		element.setAttribute("onmouseover", "highlightByteGroup(this)");
	});
	return ASN1ByteHTML;
}

function updateStandardASN1Visualiser(byteString: string) {
	//@ts-ignore
	let asn1: ASN1BER = new ASN1BER(Uint8Array.fromHex(byteString));
	let byteBox: HTMLDivElement = document.getElementById("StandardParser")! as HTMLDivElement;
	let asn1HTML: HTMLDivElement[] = createASN1ByteHTML(asn1);

	while (byteBox.lastChild) {
		byteBox.removeChild(byteBox.lastChild);
	}

	asn1HTML.forEach((div) => {
		byteBox.appendChild(div);
	});
}

function updateFirewallASN1Visualiser(byteString: string) {
	//@ts-ignore
	let asn1: ASN1BER = new ASN1BER(Uint8Array.fromHex(byteString), true);
	let byteBox: HTMLDivElement = document.getElementById("FirewallParser")! as HTMLDivElement;
	let asn1HTML: HTMLDivElement[] = createASN1ByteHTML(asn1);

	while (byteBox.lastChild) {
		byteBox.removeChild(byteBox.lastChild);
	}

	asn1HTML.forEach((div) => {
		byteBox.appendChild(div);
	});
}

function updateVisualisers(byteString: string) {
	//This is ugly, but we're resetting the firewall parser exception each time we update. This is my quick alternative to changing the actual parser too much.
	FIREWALL_EXCEPTION_TRIGGERED = false;
	updateStandardASN1Visualiser(byteString);
	updateFirewallASN1Visualiser(byteString);
}
