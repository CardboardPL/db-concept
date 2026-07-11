import { BinaryTreeNode } from "./BinaryTreeNode";

class AVLTreeNode extends BinaryTreeNode {
    constructor(data, weight, height, left, right) {
        super(data, left, right);
        this.weight = weight;
        this.height = height;
    }
}

export class AVLTree {
    #root;

    constructor(data, weight) {
        if (data == null) return;
        this.#root = new AVLTreeNode(data, weight);

        // TODO: Create balancing mechanism
    }

    // TODO: try and figure out how to update heights
    // TODO: test in different cases
    // TODO: implement right rotation
    #rotateLeft(root) {
        const right = root.right;

        // Normalize the bend
        const pivot = right.left;
        if (pivot) {
            root.setRight(pivot);
            pivot.setRight(right);
        }

        // Perform a left rotation
        if (root.parent) {
            const rightNode = root.right;
            root.parent.setRight(rightNode);
            rightNode.setLeft(root);
        } else {
            this.#root = root.right;
            root.right.setLeft(root);
        }
    }

    #rotateRight(root) {
        
    }

    #balanceSubTree(root) {
        const leftSubTreeHeight = root.left ? root.left.height : 0;
        const rightSubTreeHeight = root.right ? root.right.height : 0;

        // Handle no rotation needed case
        const balanceFactor = leftSubTreeHeight - rightSubTreeHeight;
        if (Math.abs(balanceFactor) <= 1) return;
        const isLeftHeavy = balanceFactor > 0;
    }

    #balanceTree() {
        
    }

    // TODO: work on the rotation logic to balance the tree after setting the node's values
    insert(data, weight) {
        if (data == null) return;
        weight = weight == null ? data : weight;
        const node = new AVLTreeNode(data, weight);

        // Create a root if necessary
        if (!this.#root) {
            this.#root = node;
            return;
        }

        // Traverse the tree to place the item to the correct spot
        let curr = this.#root;
        while (true) {
            if (curr.weight > weight) {
                if (curr.left) {
                    curr = curr.left;
                } else {
                    curr.setLeft(node);
                    break;
                }
            } else if (curr.weight < weight) {
                if (curr.right) {
                    curr = curr.right;
                } else {
                    curr.setRight(node);
                    break;
                }
            } else {
                throw new Error(`An element with the weight "${weight}" already exists in the tree`);
            }
        }
    }
}