export function initializeTaskManagerSchema(db) {
    /* Categories Schema
        categoryId,
        categoryName,
        createdAt,
        lastUpdatedAt
    */
    const taskCategoryStore = db.createObjectStore('taskCategories', { keyPath: 'categoryId' });
    taskCategoryStore.createIndex('categoryName', 'categoryName', { unique: true });
    taskCategoryStore.createIndex('createdAt', 'createdAt', { unique: false });
    taskCategoryStore.createIndex('lastUpdatedAt', 'lastUpdatedAt', { unique: false });

    /* taskCategoryLinks Schema
        categoryId,
        headProjectId,
        tailProjectId,
        prevCategoryId
        nextCategoryId,
    */
    const taskCategoryLinksStore = db.createObjectStore('taskCategoryLinks', { keyPath: 'categoryId' });
    taskCategoryLinksStore.createIndex('headProjectId', 'headProjectId', { unique: false });
    taskCategoryLinksStore.createIndex('tailProjectId', 'tailProjectId', { unique: false });
    taskCategoryLinksStore.createIndex('prevCategoryId', 'prevCategoryId', { unique: false });
    taskCategoryLinksStore.createIndex('nextCategoryId', 'nextCategoryId', { unique: false });
    
    /* Projects Schema
        projectId,
        projectName,
        createdAt,
        lastUpdatedAt,
    */
    const taskProjectsStore = db.createObjectStore('taskProjects', { keyPath: 'projectId' });
    taskProjectsStore.createIndex('projectName', 'projectName', { unique: false });
    taskProjectsStore.createIndex('createdAt', 'createdAt', { unique: false });
    taskProjectsStore.createIndex('lastUpdatedAt', 'lastUpdatedAt', { unique: false });

    /* ProjectLinks Schema
        projectId,
        categoryId,
        headTaskId,
        tailTaskId,
    */
    const taskProjectsLinksStore = db.createObjectStore('taskProjectsLinks', { keyPath: 'projectId' });
    taskProjectsLinksStore.createIndex('categoryId', 'categoryId', { unique: false });
    taskProjectsLinksStore.createIndex('headTaskId', 'headTaskId', { unique: false });
    taskProjectsLinksStore.createIndex('tailTaskId', 'tailTaskId', { unique: false });

    /* Tasks Schema
        taskId,
        title,
        description,
        dueDate,
        status,
        createdAt,
        lastUpdatedAt
    */
    const tasksStore = db.createObjectStore('tasks', { keyPath: 'taskId' });
    tasksStore.createIndex('title', 'title', { unique: false });
    tasksStore.createIndex('dueDate', 'dueDate', { unique: false });
    tasksStore.createIndex('status', 'status', { unique: false });
    tasksStore.createIndex('createdAt', 'createdAt', { unique: false });
    tasksStore.createIndex('lastUpdatedAt', 'lastUpdatedAt', { unique: false });

    /* TaskLinks Schema
        taskId,
        parentTaskId,
        parentProjectId,
        prevTaskId,
        nextTaskId,
        headSubTaskId,
        tailSubTaskId
    */
    const taskLinksStore = db.createObjectStore('taskLinks', { keyPath: 'taskId' });
    taskLinksStore.createIndex('parentTaskId', 'parentTaskId', { unique: false });
    taskLinksStore.createIndex('parentProjectId', 'parentProjectId', { unique: false });
    taskLinksStore.createIndex('prevTaskId', 'prevTaskId', { unique: false });
    taskLinksStore.createIndex('nextTaskId', 'nextTaskId', { unique: false });
    taskLinksStore.createIndex('headSubTaskId', 'headSubTaskId', { unique: false });
    taskLinksStore.createIndex('tailSubTaskId', 'tailSubTaskId', { unique: false });

    /* TaskTags Schema
        tagId,
        tagName,
        tagColor,
        order
    */
    const taskTagsStore = db.createObjectStore('taskTags', { keyPath: 'tagId' });
    taskTagsStore.createIndex('tagName', 'tagName', { unique: true });
    
    /* TaskTagLinks Schema
        tagId,
        taskId,
    */
    const taskTagLinksStore = db.createObjectStore('taskTagLinks', { keyPath: ['taskId', 'tagId'] });
    taskTagLinksStore.createIndex('taskId', 'taskId', { unique: false });
}