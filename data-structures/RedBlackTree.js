import { BinaryTreeNode } from "./BinaryTreeNode.js";

class RedBlackTreeNode extends BinaryTreeNode {
    constructor(key, data, isRed = true) {
        if (key == null || Number.isNaN(key)) throw new Error('Key must not be null, undefined, or NaN');
        super(data);
        this.key = key;
        this.isRed = isRed;
    }
}