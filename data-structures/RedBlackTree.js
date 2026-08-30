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

    // Perform a left rotation
    #rotateLeft() {

    }

    // Perform a right rotation
    #rotateRight() {

    }

    #handleRotations(curr, parent, grandParent) {
        grandParent.isRed = true;
        let isLeftRotation = false;
        let pivot = parent;

        // check for preliminary rotations
        if (grandParent.left === parent) {
            if (parent.right === curr) {
                this.#rotateLeft(pivot, curr);
                pivot = curr;
                curr.isRed = false;
            } else {
                parent.isRed = false;
            }
        } else {
            isLeftRotation = true;
            if (parent.left === curr) {
                this.#rotateRight(pivot, curr);
                pivot = curr;
                curr.isRed = false;
            } else {
                parent.isRed = false;
            }
        }

        // perform primary rotation
        isLeftRotation ? this.#rotateLeft(grandParent, pivot) : this.#rotateRight(grandParent, pivot);
    }

    /** 
     * Repairs the tree by looking for violations
     * @param {RedBlackTreeNode} node - starting point of the repair mechanism
     */
    #fixViolations(node) {
        if (!node || !node.parent || !node.parent.isRed) {
            return;
        }

        let curr = node;
        while (true) {
            const parent = curr.parent;
            if (!parent || !parent.isRed) return;

            const grandParent = parent.parent;
            const uncle = grandParent.left === parent ? grandParent.right : grandParent.left;

            // Handle second case
            if (!uncle || !uncle.isRed) {
                this.#handleRotations(curr, parent, grandParent);
            // Handle first case
            } else {
                uncle.isRed = false;
                parent.isRed = false;
                if (grandParent !== this.#root) grandParent.isRed = true;
            }

            // move up
            curr = grandParent;
        }
    }

    #findNode(key) {
        let curr = this.#root;
        while (curr) {
            if (curr.key === key) {
                return curr;
            }
            curr = curr.key > key ? curr.left : curr.right;
        }
        return null;
    }

    /**
     * Inserts a node into the tree
     * @param {any} key - identifier of the node
     * @param {any} data - data of the node
     */
    insert(key, data) {
        if (!this.#root) {
            this.#root = new RedBlackTreeNode(key, data, false);
            return;
        }

        const node = new RedBlackTreeNode(key, data, true);
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
                throw new Error(`An element with the key "${key}" already exists in the tree`);
            }
        }

        // Repair the tree
        this.#fixViolations(node);
    }

    /** 
     * Gets the data of a node given a key.
     * @param {any} key - identifier of the target node
     * @returns {any} the value of the target node or null if nothing was found
     */
    getData(key) {
        const node = this.#findNode(key);
        return node ? node.data : null;
    }

    /** 
     * Updates the data of a node given a key.
     * @param {any} key - identifier of the target node
     * @returns {Boolean} a boolean representing if the node's data was updated or not
     */
    updateData(key, data) {
        const node = this.#findNode(key);
        if (node) {
            node.data = data;
            return true;
        }
        return false;
    }

    /** 
     * Deletes a node from the tree given a key.
     * @param {any} key - identifier of the target node
     * @returns {Boolean} a boolean representing if the node was deleted or not
     */
    delete(key) {
        
    }
}