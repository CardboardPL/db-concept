const requestsChannel = new BroadcastChannel('requests');
const responsesChannel = new BroadcastChannel('responses');
const dbChannel = new BroadcastChannel('db-channel');

function generateHandoffStatusResponse(status, id) {
    return {
        type: 'handoff-status',
        status,
        id
    };
}

self.addEventListener('message', (e) => {
    const port = e.ports[0];
    
    if (port) {
        const type = e.data.type;
        if (type === 'heartbeat') {
            port.postMessage({
                type: 'heartbeat-response'
            });
        }
    }
});

const requestMap = new Map();
dbChannel.addEventListener('message', (e) => {
    const { type, requestId } = e.data;
    const handler = requestMap.get(requestId);
    if (typeof handler === 'function') {
        handler(type);
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

    const id = messageRequest.id;
    if (!id) {
        console.warn('Message received without an id');
        return;
    }
    
    const requestId = crypto.randomUUID();
    try {
        switch (messageRequest.op) {
            case 'db':
                const payload = {
                    type: messageRequest.type,
                    requestId
                }
                
                await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject('Database failed to respond in time');
                    }, 15000);
                    requestMap.set(requestId, (type) => {
                        clearTimeout(timeoutId);
                        if (type === 'handoff-response') {
                            resolve();
                            requestMap.delete(requestId);
                        }
                    });
                    dbChannel.postMessage(payload);
                });
                responsesChannel.postMessage(
                    generateHandoffStatusResponse(true, id)
                );
                break;
            default:
                console.error('Invalid Operation Worker');
        }
    } catch(err) {
        responsesChannel.postMessage(
            generateHandoffStatusResponse(false, id)
        );
        console.error(err);
    }
    requestMap.delete(requestId);
});