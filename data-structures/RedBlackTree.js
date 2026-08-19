import { BinaryTreeNode } from "./BinaryTreeNode.js";

class RedBlackTreeNode extends BinaryTreeNode {
    constructor(key, data, isRed = true) {
        if (key == null || Number.isNaN(key)) throw new Error('Key must not be null, undefined, or NaN');
        super(data === undefined ? key : data);
        this.key = key;
        this.isRed = isRed;
    }
}

export class RedBlackTree {
    #root;

    constructor(key, data) {
        if (key == null) return;
        this.#root = new RedBlackTreeNode(key, data, false);
    }

    /** 
     * Repairs the tree by looking for violations
     * @param {RedBlackTreeNode} node - starting point of the repair mechanism
     */
    #fixViolations(node) {

    }

    /**
     * Inserts a node into the tree
     * @param {any} key - identifier of the node
     * @param {any} data - data of the node
     */
    insert(key, data) {
        const node = new RedBlackTreeNode(key, data, true);
        if (!this.#root) {
            this.#root = node;
            node.isRed = false;
            return;
        }

        let curr = this.#root;
        while (curr) {
            if (curr.key > key) {
                if (curr.left) {
                    curr = curr.left;
                } else {
                    curr.setLeft(node);
                    break;
                }
            } else if (curr.key < key) {
                if (curr.right) {
                    curr = curr.right;
                } else {
                    curr.setRight(node);
                    break;
                }
            } else {
                throw new Error(`AN element with the key "${key}" already exists in the tree`);
            }
        }

        // Repair the tree
        this.#fixViolations(curr);
    }

    /** 
     * Gets the data of a node given a key.
     * @param {any} key - identifier of the target node
     * @returns {any} the value of the target node or null if nothing was found
     */
    getData(key) {

    }

    /** 
     * Updates the data of a node given a key.
     * @param {any} key - identifier of the target node
     * @returns {Boolean} a boolean representing if the node's data was updated or not
     */
    updateData(key) {

    }

    /** 
     * Deletes a node from the tree given a key.
     * @param {any} key - identifier of the target node
     * @returns {Boolean} a boolean representing if the node was deleted or not
     */
    delete(key) {
        
    }
}