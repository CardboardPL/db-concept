import { BinaryTreeNode } from "./BinaryTreeNode";

class SelfBalancingBinaryTreeNode extends BinaryTreeNode {
    constructor(data, weight, height, left, right) {
        super(data, left, right);
        this.weight = weight;
        this.height = height;
    }
}

export class SelfBalancingBinaryTree {
    #root;

    constructor(data, weight) {
        if (data == null) return;
        this.#root = new SelfBalancingBinaryTreeNode(data, weight);

        // TODO: Create balancing mechanism
    }

    #balanceSubTree(subTreeRoot) {
        let leftSubTreeHeight = 0;
        if (subTreeRoot.left) {
            leftSubTreeHeight = subTreeRoot.left.height;
        }

        let rightSubTreeHeight = 0;
        if (subTreeRoot.right) {
            rightSubTreeHeight = subTreeRoot.right.height;
        }

        // Handle no rotation needed case
        const balanceFactor = leftSubTreeHeight - rightSubTreeHeight; 
        if (Math.abs(balanceFactor) <= 1) return;
    }

    #balanceTree() {
        
    }

    // TODO: work on the rotation logic to balance the tree after setting the node's values
    insert(data, weight) {
        if (data == null) return;
        weight = weight == null ? data : weight;
        const node = new SelfBalancingBinaryTreeNode(data, weight);

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