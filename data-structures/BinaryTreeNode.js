export class BinaryTreeNode {
    constructor(config = {
        left: null,
        right: null,
        data: null,
    }) {
        // Validate arguments
        if (!isPlainObject(config)) throw new TypeError(`Expected config to be a plain object but received: ${Array.isArray(config) ? 'an Array' : 'a ' + typeof config}`);

        // Setup left pointer
        if (config.left == null) {
            this.left = null;
        } else if (!(config.left instanceof BinaryTreeNode)) { 
            throw new TypeError('Expected left node to be an instance of BinaryTreeNode or null/undefined');
        } else {
            this.setLeft(config.left);
        }

        // Setup right pointer
        if (config.right == null) {
            this.right = null;
        } else if (!(config.right instanceof BinaryTreeNode)) { 
            throw new TypeError('Expected right node to be an instance of BinaryTreeNode or null/undefined');
        } else {
            this.setRight(config.right);
        }

        // Set up parent
        this.parent = null;

        // Assign data property
        this.data = config.data;
    }

    setLeft(node) {
        if (!(node instanceof BinaryTreeNode) && node !== null) throw new Error('Expected the left node to be an instance of a "BinaryTreeNode"');

        // Clean up pointers
        if (this.left) {
            this.left.parent = null;
        }

        if (node === null) {
            this.left = null;
            return;
        }

        if (node.parent) {
            if (node.parent.left === node) {
                node.parent.left = null;
            } else {
                node.parent.right = null;
            }
        }

        // Set up pointers
        this.left = node;
        node.parent = this;
    }

    setRight(node) {
        if (!(node instanceof BinaryTreeNode) && node !== null) throw new Error('Expected the right node to be an instance of a "BinaryTreeNode"');

        // Clean up pointers
        if (this.right) {
            this.right.parent = null;
        }

        if (node === null) {
            this.right = null;
            return;
        }

        if (node.parent) {
            if (node.parent.left === node) {
                node.parent.left = null;
            } else {
                node.parent.right = null;
            }
        }

        // Set up pointers
        this.right = node;
        node.parent = this;
    }
}