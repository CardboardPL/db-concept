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
}