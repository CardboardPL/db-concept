const workerStatus = {};

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

async function requestWorkers(channelName, lockName, workerName, workerFilePath) {
    const broadcastChannel = new BroadcastChannel(channelName);
    try {
        workerStatus[workerName] = 'requested';
        return navigator.locks.request(lockName, async () => {
            broadcastChannel.postMessage({
                message: `Initializing ${workerName}`,
                timestamp: Date.now()
            });
            workerStatus[workerName] = 'initializing';
            const hubWorker = new Worker(workerFilePath);
            hubWorker.onerror = (event) => {
                throw event.error;
            };
        
            await checkStatus(hubWorker, `${workerName} Status Check`);
            workerStatus[workerName] = 'online';
            broadcastChannel.postMessage({
                message: `${workerName} Online`,
                timestamp: Date.now()
            });

            hubWorker.onerror = null;
            await new Promise((resolve, reject) => {
                hubWorker.onerror = (event) => reject(event.error);

                const heartbeat = setInterval(async () => {
                    try {
                        await checkStatus(hubWorker, `${workerName} Status Check`);
                    } catch (e) {
                        clearInterval(heartbeat);
                        reject(new Error(`${workerName} Stopped Responding`));
                    }
                }, 40000);
            });
        });
    } catch(err) {
        workerStatus[workerName] = 'dropped';
        broadcastChannel.postMessage({
            message: `${workerName} Offline`,
            timestamp: Date.now()
        });
        throw err;
    }
}