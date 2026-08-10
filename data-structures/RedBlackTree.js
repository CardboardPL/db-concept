import { BinaryTreeNode } from "./BinaryTreeNode.js";

class RedBlackTreeNode extends BinaryTreeNode {
    constructor(data, isRed = true) {
        super(data);
        this.isRed = isRed;
    }
}