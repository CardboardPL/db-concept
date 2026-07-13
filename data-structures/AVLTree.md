# AVL Tree Plan
When performing a rotation in a scenario like:
      2
    /   \
   1     4
        / \ 
       3   5

If we were to add the value "6", we will end up with:
      2
    /   \
   1     4
        / \ 
       3   5
            \
             6

## Algorithm after an add
After adding a leaf node... we should start from the leaf node and then move upwards checking if the tree is balanced 
(the absolute value of the difference between the height of the left and right subtrees are must not be more 1).

After adding 6... we will skip to its parent... and ask if it's balanced... in this case... it is... so we will move to its parent 4... which is also balanced... so we will move to 2 where we will see that it isn't balanced because the right subtree has a height of 3 and the left subtree has a height of 1... so the difference between the heights > 1... and because of that we will perform a left rotation:

      4
    /   \
   2     5
  /       \ 
 1         6

 But we moved 4... so where did the left child of 4 go? it will go to the left side because... it's less than its parent... so to ensure that it will always be found... it will be placed as the right child of 2...

      4
    /   \
   2     5
  / \      \ 
 1   3      6
