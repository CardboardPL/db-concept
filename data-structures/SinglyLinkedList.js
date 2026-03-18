export class SinglyLinkedList {
    #length = 0;

    constructor(head) {
        if (head === null) {
            this.head = null;
            this.tail = null;
        } else {
            if (!(head instanceof SNode)) {
                throw new Error('Provide a valid "head" SNode to create a singly linked list.');
            }
            this.head = head;
            this.#length = 1;
    
            let curr = head;
            while (curr.next !== null) {
                curr = curr.next;
                this.#length++;
            }
            
            this.tail = curr;
        }
    }

    appendNode(node) {
        const tail = this.tail;

        if (!tail) {
            this.head = node;
            this.tail = node;
        } else {
            this.tail.next = node;
            this.tail = node;
        }

        this.#length++;
    }

    peekHead() {
        return this.head;
    }

    removeHead() {
        const head = this.head;

        if (!head) return null;
        if (!head.next) {
            this.head = null;
            this.tail = null;
        } else {
            this.head = this.head.next;
        }

        this.#length--;
        return head;
    }

    size() {
        return this.#length;
    }

    *[Symbol.iterator]() {
        let curr = this.head;
        while (curr) {
            yield curr;
            curr = curr.next;
        }
    }
}

export class SNode {
    constructor(data) {
        this.next = null;
        this.data = data;
    }
}