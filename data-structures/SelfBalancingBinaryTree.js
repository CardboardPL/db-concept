import { BinaryTreeNode } from "./BinaryTreeNode";

class SelfBalancingBinaryTreeNode extends BinaryTreeNode {
    constructor(data, weight, height, left, right) {
        super(data, left, right);
        this.weight = weight;
        this.height = height;
    }
}

class SelfBalancingBinaryTree {
    #root;

    constructor(data, weight) {
        if (data == null) return;
        this.#root = new SelfBalancingBinaryTreeNode(data, weight);

        // TODO: Create balancing mechanism
    }

    #balanceTree() {
        
    }
}