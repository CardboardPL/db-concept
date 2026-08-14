import { BinaryTreeNode } from "./BinaryTreeNode.js";

class RedBlackTreeNode extends BinaryTreeNode {
    constructor(key, data, isRed = true) {
        if (key == null || Number.isNaN(key)) throw new Error('Key must not be null, undefined, or NaN');
        super(data === undefined ? key : data);
        this.key = key;
        this.isRed = isRed;
    }
}

class RedBlackTree {
    #root;

    constructor(key, data) {
        if (key == null) return;
        this.#root = new RedBlackTreeNode(key, data, false);
    }

    /**
     * Inserts a node into the tree
     * @param {any} key - identifier of the node
     * @param {any} data - data of the node
     * @returns {Boolean} a boolean representing if a node was inserted or not
     */
    insert(key, data) {
        
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