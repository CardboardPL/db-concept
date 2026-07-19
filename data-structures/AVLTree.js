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
    // TODO: test in different cases (look at double rotation cases)
    // TODO: split up rotations into independent methods
    #handleRightImbalance(root) {
        const right = root.right;

        // Normalize the bend or determine if it will have an orphan node
        let hasOrphanNode = false;
        const pivot = right.left;
        if (pivot) {
            if (!right.right) {
                root.setRight(pivot);
                pivot.setRight(right);
            } else {
                hasOrphanNode = true;
            }
        }

        // Perform a left rotation
        const newRight = root.right;
        if (root.parent) {
            root.parent.setRight(newRight);
        } else {
            this.#root = newRight;
        }
        newRight.setLeft(root);

        // Reattach orphan node if any
        if (hasOrphanNode) {
            root.setRight(pivot);
        }

        return newRight;
    }

    #handleLeftImbalance(root) {
        const left = root.left;

        // Normalize the bend or determine if it will have an orphan node
        let hasOrphanNode = false;
        const pivot = left.right;
        if (pivot) {
            if (!left.left) {
                root.setLeft(pivot);
                pivot.setLeft(left);
            } else {
                hasOrphanNode = true;
            }
        }

        // Perform a right rotation
        const newLeft = root.left;
        if (root.parent) {
            root.parent.setLeft(newLeft);
        } else {
            this.#root = newLeft;
        }
        newLeft.setRight(root);

        // Reattach orphan node if any
        if (hasOrphanNode) {
            root.setLeft(pivot);
        }

        return newLeft;
    }

    #balanceSubTree(root) {
        const leftSubTreeHeight = root.left ? root.left.height : 0;
        const rightSubTreeHeight = root.right ? root.right.height : 0;

        // Handle no rotation needed case
        const balanceFactor = leftSubTreeHeight - rightSubTreeHeight;
        if (Math.abs(balanceFactor) <= 1) return;

        return balanceFactor > 0 ? this.#handleLeftImbalance(root) : this.#handleRightImbalance(root);
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