import { isPlainObject } from '../utils/isPlainObject.js';

export class BinarySearchTree {
    #root;

    constructor(rootConfig) {
        if (rootConfig) {
            if (!isPlainObject(rootConfig)) throw new Error('Expected rootConfig to be a plain object');
            this.#root = new BinaryTreeNode(rootConfig.data, rootConfig.weight);   
        }
    }

    add(data, weight) {
        if (!weight) {
            weight = data;
        }

        if (!this.#root) {
            this.#root = new BinaryTreeNode(data, weight);
            return;
        }

        // Insrt node into the correct position
        let current = this.#root;
        while (true) {
            if (weight > current.weight) {
                if (!current.right) {
                    current.setRight(new BinaryTreeNode(data, weight));
                    break;
                }

                current = current.right;
            } else {
                if (!current.left) {
                    current.setLeft(new BinaryTreeNode(data, weight));
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

    // TODO: add binary tree methods 
    // TODO (FUTURE): extend this to have a balancing mechanism (new class)
}

class BinaryTreeNode {
    constructor(data, weight, parent = null, left = null, right = null) {
        this.parent = parent;
        this.left = left;
        this.right = right;
        this.data = data;
        this.weight = weight;
    }

    setLeft(node) {
        if (!(node instanceof BinaryTreeNode) && node !== null) throw new Error('Expected the left node to be an instance of a "BinaryTreeNode"');

        // Clean up pointers
        if (this.left) {
            this.left.parent = null;
        }

        if (node === null) {
            this.left = null;
            return;
        }

        if (node.parent) {
            if (node.parent.left === node) {
                node.parent.left = null;
            } else {
                node.parent.right = null;
            }
        }

        // Set up pointers
        this.left = node;
        node.parent = this;
    }

    setRight(node) {
        if (!(node instanceof BinaryTreeNode) && node !== null) throw new Error('Expected the right node to be an instance of a "BinaryTreeNode"');

        // Clean up pointers
        if (this.right) {
            this.right.parent = null;
        }

        if (node === null) {
            this.right = null;
            return;
        }

        if (node.parent) {
            if (node.parent.left === node) {
                node.parent.left = null;
            } else {
                node.parent.right = null;
            }
        }

        // Set up pointers
        this.right = node;
        node.parent = this;
    }
}