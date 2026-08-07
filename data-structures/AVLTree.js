import { BinaryTreeNode } from "./BinaryTreeNode.js";

class AVLTreeNode extends BinaryTreeNode {
    constructor(data, weight, height, left, right) {
        super(data, left, right);
        this.weight = weight;
        this.height = height;
    }
}

export class AVLTree {
    #root;

    constructor(weight, data) {
        if (weight == null) return;
        data = data == null ? weight : data;
        this.#root = new AVLTreeNode(data, weight, 1);
    }

    #updateSubTreeHeight(root) {
        const leftSubTreeHeight = root.left ? root.left.height : 0;
        const rightSubTreeHeight = root.right ? root.right.height : 0;
        root.height = Math.max(leftSubTreeHeight, rightSubTreeHeight) + 1;
    }

    #calculateBalanceFactor(root) {
        if (!root) return 0;
        const leftSubTreeHeight = root.left ? root.left.height : 0;
        const rightSubTreeHeight = root.right ? root.right.height : 0;
        return leftSubTreeHeight - rightSubTreeHeight;
    }

    #rotateLeft(initialRoot) {
        const newRoot = initialRoot.right;
        const initialRootParent = initialRoot.parent;

        // Attach newRoot to its new parent
        if (initialRootParent) {
            if (initialRootParent.left === initialRoot) {
                initialRootParent.setLeft(newRoot);
            } else {
                initialRootParent.setRight(newRoot);
            }
        } else {
            this.#root = newRoot;
        }

        // Manage the pointers for the nodes that became orphaned
        initialRoot.setRight(newRoot.left);
        newRoot.setLeft(initialRoot);

        // Update heights
        this.#updateSubTreeHeight(initialRoot);
        this.#updateSubTreeHeight(newRoot);

        return newRoot;
    }

    #rotateRight(initialRoot) {
        const newRoot = initialRoot.left;
        const initialRootParent = initialRoot.parent;

        // Attach newRoot to its new parent
        if (initialRootParent) {
            if (initialRootParent.left === initialRoot) {
                initialRootParent.setLeft(newRoot);
            } else {
                initialRootParent.setRight(newRoot);
            }
        } else {
            this.#root = newRoot;
        }

        // Manage the pointers for the nodes that became orphaned
        initialRoot.setLeft(newRoot.right);
        newRoot.setRight(initialRoot);

        // Update heights
        this.#updateSubTreeHeight(initialRoot);
        this.#updateSubTreeHeight(newRoot);

        return newRoot;
    }

    #handleRightImbalance(root) {
        const right = root.right;

        // Normalize the bend
        if (this.#calculateBalanceFactor(right) > 0) {
            this.#rotateRight(right);
        }
        return this.#rotateLeft(root);
    }

    #handleLeftImbalance(root) {
        const left = root.left;

        // Normalize the bend
        if (this.#calculateBalanceFactor(left) < 0) {
            this.#rotateLeft(left);
        }
        return this.#rotateRight(root);
    }

    #balanceTree(start) {
        let curr = start;
        while (curr) {            
            const currBalanceFactor = this.#calculateBalanceFactor(curr);
            if (Math.abs(currBalanceFactor) <= 1) {
                this.#updateSubTreeHeight(curr);
                curr = curr.parent;
            } else {
                curr = currBalanceFactor > 0 ? this.#handleLeftImbalance(curr) : this.#handleRightImbalance(curr);
            }
        }
    }

    insert(weight, data) {
        if (weight == null) return false;
        data = data == null ? weight : data;
        const node = new AVLTreeNode(data, weight, 1);

        // Create a root if necessary
        if (!this.#root) {
            this.#root = node;
            return true;
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
        this.#balanceTree(curr);
        return true;
    }

    getData(weight) {
        let curr = this.#root;
        while (curr) {
            if (curr.weight === weight) {
                return curr.data;
            } else if (weight > curr.weight) {
                curr = curr.right;
            } else {
                curr = curr.left;
            }
        }
        return null;
    }

    updateData(weight, newData) {
        let curr = this.#root;
        while (curr) {
            if (curr.weight === weight) {
                curr.data = newData;
                return true;
            } else if (weight > curr.weight) {
                curr = curr.right;
            } else {
                curr = curr.left;
            }
        }
        return false;
    }

    delete(weight) {
        // find node to delete
        let curr = this.#root;
        while (curr) {
            const currWeight = curr.weight;
            if (currWeight === weight) {
                break;
            } else if (weight > currWeight) {
                curr = curr.right;
            } else {
                curr = curr.left;
            }
        }

        // Return early if match wasn't found
        if (curr == null) return false;

        // Handle 0 or 1 child case
        const currParent = curr.parent;
        if (!curr.left || !curr.right) {
            const child = curr.left ? curr.left : curr.right;

            if (!currParent) {
                this.#root = child;
                if (child) child.parent = null;
            } else {
                if (currParent.left === curr) {
                    currParent.setLeft(child);
                } else {
                    currParent.setRight(child);
                }
                
                this.#updateSubTreeHeight(currParent);
                this.#balanceTree(currParent);
            }
            return true;
        }

        // Find the in-order successor
        const toOverwrite = curr;
        curr = curr.right;
        while (curr) {
            if (curr.left) {
                curr = curr.left
            } else {
                // overwrite the node to be overwritten to have the in-order successor's data
                toOverwrite.data = curr.data;
                toOverwrite.weight = curr.weight;
                
                // unlink the leaf node where the in-order successor lived
                const parent = curr.parent;
                if (parent.left === curr) {
                    parent.setLeft(curr.right);
                } else {
                    parent.setRight(curr.right);
                }

                // rebalance tree
                this.#updateSubTreeHeight(parent);
                this.#balanceTree(parent);

                return true;
            }
        }
    }
}