const requestsChannel = new BroadcastChannel('requests');
const responsesChannel = new BroadcastChannel('responses');
const dbChannel = new BroadcastChannel('db-channel');

self.addEventListener('message', (e) => {
    const port = e.ports[0];
    
    if (port) {
        if (e.data === 'Hub Worker Status Check') {
            port.postMessage('Active');
        }
    }
});

requestsChannel.addEventListener('message', async (e) => {
    const messageRequest = e.data;

    if (!messageRequest) return;
    
    const { senderUUID, operationWorker } = messageRequest;

    if (!senderUUID) {
        console.error('Message sent without a senderUUID');
        return;
    }

    try {
        switch (operationWorker) {
            case 'db':
                const payload = {
                    type: messageRequest.type
                }
                
                await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject('Database failed to respond in time');
                    }, 15000);
                    dbChannel.onmessage = (e) => {
                        clearTimeout(timeoutId);
                        if (e.data === 'Success') {
                            resolve();
                            dbChannel.onmessage = null;
                        } else {
                            reject(e.data);
                        }
                    }

                    dbChannel.postMessage(payload);
                });
                responsesChannel.postMessage({
                    type: 'Status Check',
                    status: 'Success',
                    senderUUID
                });
                break;
            default:
                console.error('Invalid Operation Worker');
        }
    } catch(err) {
        console.error(err);
    }
});