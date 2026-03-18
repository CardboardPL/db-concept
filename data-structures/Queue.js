import { SinglyLinkedList, SNode } from './SinglyLinkedList.js';

export class Queue {
    #linkedList;

    constructor(linkedList) {
        this.#linkedList = linkedList instanceof SinglyLinkedList ? linkedList : new SinglyLinkedList();
    }

    enqueue(data) {
        const node = new SNode(data);
        this.#linkedList.appendNode(node);
    }

    dequeue() {
        if (!this.queueSize()) return null; 
        return this.#linkedList.removeHead().data;
    }

    peek() {
        if (!this.queueSize()) return null; 
        return this.#linkedList.peekHead().data;
    }

    queueSize() {
        return this.#linkedList.size();
    }

    *[Symbol.iterator]() {
        for (const item of this.#linkedList) {
            yield item.data;
        }
        
    }

    *consume() {
        while (this.queueSize()) {
            yield this.dequeue();
        }
    }
}