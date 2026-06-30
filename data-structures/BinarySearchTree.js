import { BinaryTreeNode } from './BinaryTreeNode.js';

class BinarySearchTreeNode extends BinaryTreeNode {
    constructor(data, weight, left, right) {
        super(data, left, right);
        this.weight = weight === undefined ? data : weight;
    }
}

export class BinarySearchTree {
    #root;

    constructor(data, weight, left, right) {
        if (data == null) return;
        this.#root = new BinarySearchTreeNode(data, weight || data, left, right);
    }

    add(data, weight) {
        if (data == null) throw new TypeError('Tried Adding a node with no data');
        if (!this.#root) {
            this.#root = new BinarySearchTreeNode(data, weight);
            return;
        }

        // Insert node into the correct position
        let current = this.#root;
        while (true) {
            if (weight > current.weight) {
                if (!current.right) {
                    current.setRight(new BinarySearchTreeNode(data, weight));
                    break;
                }

                current = current.right;
            } else {
                if (!current.left) {
                    current.setLeft(new BinarySearchTreeNode(data, weight));
                    break;
                }
                current = current.left;
            }
        }
    }

    findByWeight(weight) {
        let current = this.#root;

        while (true) {
            if (!current) return null;

            const currentWeight = current.weight;
            if (weight === currentWeight) return current;

            if (weight > currentWeight) {
                current = current.right;
            } else {
                current = current.left;
            }
        }
    }

    removeByWeight(weight) {
        const initialNode = this.findByWeight(weight);
        if (!initialNode) return null;

        // Set up necessary variables
        let current = initialNode;
        let currentParent = current.parent;
        let currentLeftNode = current.left;
        let currentRightNode = current.right;

        // handle no children case
        if (!currentLeftNode && !currentRightNode) {
            if (currentParent) {
                if (currentParent.left === current) {
                    currentParent.setLeft(null);
                } else {
                    currentParent.setRight(null);
                }
            } else {
                this.#root = null;
            }
            return current;
        }

        // handle one child case
        if (currentLeftNode && !currentRightNode) {
            if (currentParent) {
                if (currentParent.left === current) {
                    currentParent.setLeft(currentLeftNode);
                } else {
                    currentParent.setRight(currentLeftNode);
                }
            } else {
                this.#root = currentLeftNode;
            }
            return current;
        } else if (!currentLeftNode && currentRightNode) {
            if (currentParent) {
                if (currentParent.left === current) {
                    currentParent.setLeft(currentRightNode);
                } else {
                    currentParent.setRight(currentRightNode);
                }
            } else {
                this.#root = currentRightNode;
            }
            return current;
        }

        // handle two child case
        current = current.right;
        while (true) {
            currentParent = current.parent;
            currentLeftNode = current.left;
            currentRightNode = current.right;
            
            if (!currentLeftNode) {
                initialNode.data = current.data;
                initialNode.weight = current.weight;
                if (currentParent.left === current) {
                    currentParent.setLeft(currentRightNode);
                } else {
                    currentParent.setRight(currentRightNode);
                }
                return current;
            } else {
                current = currentLeftNode;
            }
        }
    }

    removeSubTreeByWeight(weight) {
        const node = this.findByWeight(weight);
        if (!node) return null;

        // Disconnect subtree from the parent
        const parentNode = node.parent;
        if (parentNode) {
            if (node.weight > parentNode.weight) {
                parentNode.setRight(null);
            } else {
                parentNode.setLeft(null);
            }
        } else {
            this.#root = null;
        }

        return node;
    }
}

// TODO: add binary tree methods 
// TODO (FUTURE): extend this to have a balancing mechanism (new class)