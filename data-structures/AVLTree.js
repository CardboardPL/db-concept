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

    #updateSubTreeHeight(root) {
        const leftSubTreeHeight = root.left ? root.left.height : 0;
        const rightSubTreeHeight = root.right ? root.right.height : 0;
        root.height = Math.max(leftSubTreeHeight, rightSubTreeHeight) + 1;
    }

    #calculateBalanceFactor(root) {
        const leftSubTreeHeight = root.left ? root.left.height : 0;
        const rightSubTreeHeight = root.right ? root.right.height : 0;
        return leftSubTreeHeight - rightSubTreeHeight;
    }

    #rotateLeft(initialRoot) {
        const newRoot = initialRoot.right;
        const grandParent = initialRoot.parent;

        // Attach newRoot to its new parent
        if (grandParent) {
            if (grandParent.left === initialRoot) {
                grandParent.setLeft(newRoot);
            } else {
                grandParent.setRight(newRoot);
            }
        } else {
            this.#root = newRoot;
        }

        // Manage the pointers for the nodes that became orphaned
        if (newRoot.left) {
            initialRoot.setRight(newRoot.left);
        }
        newRoot.setLeft(initialRoot);

        // Update heights
        this.#updateSubTreeHeight(initialRoot);
        this.#updateSubTreeHeight(newRoot);

        return newRoot;
    }

    #rotateRight(initialRoot) {
        const newRoot = initialRoot.left;
        const grandParent = initialRoot.parent;

        // Attach newRoot to its new parent
        if (grandParent) {
            if (grandParent.left === initialRoot) {
                grandParent.setLeft(newRoot);
            } else {
                grandParent.setRight(newRoot);
            }
        } else {
            this.#root = newRoot;
        }

        // Manage the pointers for the nodes that became orphaned
        if (newRoot.right) {
            initialRoot.setLeft(newRoot.right);
        }
        newRoot.setRight(initialRoot);

        // Update heights
        this.#updateSubTreeHeight(initialRoot);
        this.#updateSubTreeHeight(newRoot);

        return newRoot;
    }

    #handleRightImbalance(root) {
        const right = root.right;

        // Normalize the bend
        if (right.left && !right.right) {
            this.#rotateRight(right);
        }
        return this.#rotateLeft(root);
    }

    #handleLeftImbalance(root) {
        const left = root.left;

        // Normalize the bend
        if (left.right && !left.left) {
            this.#rotateLeft(left);
        }
        return this.#rotateRight(root);
    }

    #balanceSubTree(root) {
        const balanceFactor = this.#calculateBalanceFactor(root);
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