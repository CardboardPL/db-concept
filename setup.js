const broadcastChannel = new BroadcastChannel('worker-status');
async function requestWorkers(broadcastChannel) {
    try {
        return navigator.locks.request('workers', async () => {
            broadcastChannel.postMessage({
                message: 'Initializing Workers',
                timestamp: Date.now()
            });
            const hubWorker = new Worker('./workers/hub.worker.js');
            hubWorker.onerror = (event) => {
                throw event.error;
            };
            
            // Verify Worker Status
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
        
            await checkStatus(hubWorker, 'Hub Worker Status Check');
            broadcastChannel.postMessage({
                message: 'Workers Online',
                timestamp: Date.now()
            });

            hubWorker.onerror = null;
            await new Promise((resolve, reject) => {
                hubWorker.onerror = (event) => reject(event.error);

                const heartbeat = setInterval(async () => {
                    try {
                        await checkStatus(hubWorker, 'Hub Worker Status Check');
                    } catch (e) {
                        clearInterval(heartbeat);
                        reject(new Error('Worker Stopped Responding'));
                    }
                }, 40000);
            });
        });
    } catch(err) {
        broadcastChannel.postMessage({
            message: 'Workers Offline',
            timestamp: Date.now()
        });
        throw err;
    }
}

requestWorkers(broadcastChannel);