const requestsChannel = new BroadcastChannel('requests');
const responsesChannel = new BroadcastChannel('responses');
const dbChannel = new BroadcastChannel('db-channel');

function generateHandoffStatusResponse(isSuccessful, senderUUID) {
    return {
        type: 'handoff status',
        isSuccessful,
        senderUUID
    }
}

self.addEventListener('message', (e) => {
    const port = e.ports[0];
    
    if (port) {
        if (e.data === 'Hub Worker Status Check') {
            port.postMessage('Active');
        }
    }
});

const requestMap = new Map();
dbChannel.addEventListener('message', (e) => {
    const { requestId, message } = e.data;
    const handler = requestMap.get(requestId);
    if (typeof handler === 'function') {
        handler(message);
        requestMap.delete(requestId);
    } else {
        console.warn('Received a noneexistent requestId');
    }
});

requestsChannel.addEventListener('message', async (e) => {
    const messageRequest = e.data;
    if (typeof messageRequest !== 'object') {
        console.warn('Ignoring data passed to the hub due to it not being an object');
        return;
    }

    const senderUUID = messageRequest.id;
    if (!senderUUID) {
        console.warn('Message received without an id');
        return;
    }
    
    const requestId = crypto.randomUUID();
    try {
        switch (messageRequest.operationWorker) {
            case 'db':
                const payload = {
                    type: messageRequest.type,
                    requestId
                }
                
                await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject('Database failed to respond in time');
                    }, 15000);
                    requestMap.set(requestId, (message) => {
                        clearTimeout(timeoutId);
                        if (message === 'Success') {
                            resolve();
                        } else {
                            reject(message);
                        }
                    });
                    dbChannel.postMessage(payload);
                });
                responsesChannel.postMessage(
                    generateHandoffStatusResponse(true, senderUUID)
                );
                break;
            default:
                console.error('Invalid Operation Worker');
        }
    } catch(err) {
        responsesChannel.postMessage(
            generateHandoffStatusResponse(false, senderUUID)
        );
        console.error(err);
    }
    requestMap.delete(requestId);
});