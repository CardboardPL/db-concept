export class BinaryTree {
    #root;

    constructor(rootValue) {
        this.#root = new BinaryTreeNode(rootValue);    
    }

    // TODO: add binary tree methods 
    // TODO (FUTURE): extend this to have a balancing mechanism (new class)
}

class BinaryTreeNode {
    constructor(data, parent = null, left = null, right = null) {
        this.parent = parent;
        this.left = left;
        this.right = right;
        this.data = data;
    }

    setLeft(node) {
        if (!(node instanceof BinaryTreeNode)) throw new Error('Expected the left node to be an instance of a "BinaryTreeNode"');

        // Clean up pointers
        if (this.left) {
            this.left.parent = null;
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
        if (!(node instanceof BinaryTreeNode)) throw new Error('Expected the right node to be an instance of a "BinaryTreeNode"');

        // Clean up pointers
        if (this.right) {
            this.right.parent = null;
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