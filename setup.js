/* Worker Portion */

// Verifies Worker Status
function checkStatus(worker) {
    const { port1, port2 } = new MessageChannel();
    return new Promise((resolve, reject) => {
        port1.start();
        worker.postMessage({
            type: 'heartbeat',
        }, [port2]);
        
        const timeoutId = setTimeout(() => {
            reject('Failed to respond within the 15 second period');
        }, 15000);

        port1.onmessage = (event) => {
            clearTimeout(timeoutId);
            if (event.data.type === 'heartbeat-response') {
                resolve();
            } else {
                reject(new Error(event.data.error));
            }
            port1.close();
        }
    });
}

function generateStatusBroadcastMessage(workerName, status) {
    return {
        type: 'worker-status',
        id: workerName,
        status,
        timestamp: Date.now()
    }
}

async function requestWorker(channelName, lockName, workerName, workerFilePath, lifecycleHandler) {
    const broadcastChannel = new BroadcastChannel(channelName);
    try {
        return navigator.locks.request(lockName, async () => {
            broadcastChannel.postMessage(generateStatusBroadcastMessage(workerName, 'Initializing'));
            const worker = new Worker(workerFilePath, { type: "module" });
            worker.onerror = (event) => {
                worker.terminate();
                throw event.error;
            };
            
            await new Promise((resolve, reject) => {
                worker.onmessage = (e) => {
                    if (e.data.type === 'worker-started') {
                        resolve();
                    }
                }
                setTimeout(() => {
                    reject('Failed to start on time');
                }, 5000);
            });
            broadcastChannel.postMessage(generateStatusBroadcastMessage(workerName, 'Online'));

            await new Promise((resolve, reject) => {
                worker.onerror = (event) => {
                    worker.terminate();
                    reject(event.error);
                };

                async function heartbeatHandler() {
                    clearTimeout(heartbeatId);
                    try {
                        await checkStatus(worker);
                        heartbeatId = setTimeout(heartbeatHandler, 40000)
                    } catch (e) {
                        worker.terminate();
                        reject(new Error(`${workerName} Stopped Responding`));
                    }
                }

                let heartbeatId = setTimeout(heartbeatHandler, 40000);

                if (typeof lifecycleHandler === 'function') lifecycleHandler(worker);
            });
        });
    } catch(err) {
        broadcastChannel.postMessage(generateStatusBroadcastMessage(workerName, 'Offline'));
        throw err;
    }
}

async function manageWorker(channelName, lockName, workerName, workerFilePath, lifecycleHandler) {
    while (true) {
        try {
            await requestWorker(channelName, lockName, workerName, workerFilePath, lifecycleHandler);
        } catch(err) {
            console.warn(workerName + ': ' + err);
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, 1000);
            });
        }
    }
}

manageWorker('workers', 'w1', 'Hub Worker', './workers/hub.worker.js');
manageWorker('workers', 'w2', 'Database Worker', './workers/db.worker.js');

/* Page Setup */
const requests = new BroadcastChannel('requests');
const responses = new BroadcastChannel('responses');

const pageId = crypto.randomUUID();

async function syncHubStatus() {
    let tries = 0;
    let delay;
    while (true) {
        tries++;
        delay = Math.min(tries * 1000, 5000);
        try {
            await new Promise((resolve, reject) => {
                requests.postMessage({
                    type: 'hub-status',
                    id: pageId
                });
                const timeoutId = setTimeout(() => {
                    reject('failed to get hub-status in time');
                }, delay + 500);
                requestMap.set(pageId + '-hubStatus', () => {
                    clearTimeout(timeoutId);
                    resolve();
                });
            });
            break;
        } catch(err) {
            console.error(err);
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, delay);
            });
        }
    }
}

// Initialize response handling
const requestMap = new Map();
responses.addEventListener('message', (e) => {
    if (!e.data) console.error('received a falsy message');
    const { type, id } = e.data;
    if (type === 'hub-status' && id === pageId) {
        const key = pageId + '-hubStatus';
        const handler = requestMap.get(key);
        if (typeof handler === 'function') {
            handler();
            requestMap.delete(key);
        }
    }
});

await syncHubStatus();

// Listen to workers channel to keep track of worker status
const workersChannel = new BroadcastChannel('workers');

// Additional startup code