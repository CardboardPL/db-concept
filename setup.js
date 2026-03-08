// Verifies Worker Status
function checkStatus(worker, message) {
    const { port1, port2 } = new MessageChannel();
    return new Promise((resolve, reject) => {
        port1.start();
        worker.postMessage(message, [port2]);
        
        port1.onmessage = (event) => {
            if (event.data === 'Active') {
                resolve();
            } else {
                reject(new Error(event.data));
            }
            port1.close();
        }
    });
}

function generateStatusBroadcastMessage(workerName, state) {
    return {
        message: `${workerName}: ${state}`,
        timestamp: Date.now()
    }
}

async function requestWorker(channelName, lockName, workerName, workerFilePath) {
    const broadcastChannel = new BroadcastChannel(channelName);
    try {
        return navigator.locks.request(lockName, async () => {
            broadcastChannel.postMessage(generateStatusBroadcastMessage(workerName, 'Initializing'));
            const worker = new Worker(workerFilePath);
            worker.onerror = (event) => {
                throw event.error;
            };
        
            await checkStatus(worker, `${workerName} Status Check`);
            broadcastChannel.postMessage(generateStatusBroadcastMessage(workerName, 'Online'));

            worker.onerror = null;
            await new Promise((resolve, reject) => {
                worker.onerror = (event) => reject(event.error);

                const heartbeat = setInterval(async () => {
                    try {
                        await checkStatus(worker, `${workerName} Status Check`);
                    } catch (e) {
                        clearInterval(heartbeat);
                        reject(new Error(`${workerName} Stopped Responding`));
                    }
                }, 40000);
            });
        });
    } catch(err) {
        broadcastChannel.postMessage(generateStatusBroadcastMessage(workerName, 'Offline'));
        throw err;
    }
}

async function manageWorker(channelName, lockName, workerName, workerFilePath) {
    while (true) {
        try {
            await requestWorkers(channelName, lockName, workerName, workerFilePath);
        } catch(err) {
            console.warn(err);
            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve();
                }, 1000);
            });
        }
    }
}

manageWorker('w1', 'w1', 'Hub Worker', './workers/hub.worker.js');