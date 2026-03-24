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
        
            await checkStatus(worker);
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
            console.warn(err);
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, 1000);
            });
        }
    }
}

manageWorker('w1', 'w1', 'Hub Worker', './workers/hub.worker.js');
manageWorker('w2', 'w2', 'Database Worker', './workers/db.worker.js');

/* Page Setup */