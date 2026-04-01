const requestsChannel = new BroadcastChannel('requests');
const responsesChannel = new BroadcastChannel('responses');
const dbChannel = new BroadcastChannel('db-channel');
const requestMap = new Map();

function generateHandoffStatusResponse(status, id) {
    return {
        type: 'handoff-status',
        status,
        id
    };
}

function handleHandoff(resolve, reject, channel, name, requestId, payload) {
    let tries = 1;
    const timeoutHandler = () => {
        if (tries === 4) {
            channel.postMessage({
                type: 'abort-transaction',
                requestId
            });
            reject(`${name} failed to respond in time`);
            requestMap.delete(requestId);
            return;
        }
        channel.postMessage(payload);
        timeoutId = setTimeout(timeoutHandler, Math.min(tries * 500, 1500));
        tries++;
    };
    let timeoutId = setTimeout(timeoutHandler, Math.min(100, 1500));
    requestMap.set(requestId, (type) => {
        clearTimeout(timeoutId);
        if (type === 'handoff-response') {
            resolve();
            requestMap.delete(requestId);
        }
    });
}

async function handleDatabaseRequest(requestId, data) {    
    await new Promise((resolve, reject) => {
        handleHandoff(resolve, reject, dbChannel, 'Database', requestId, {
            data,
            requestId
        });
    });
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

    const type = messageRequest.type;
    if (type === 'hub-status') {
        responsesChannel.postMessage({
            type: 'hub-status',
            id
        });
        return;
    }
    
    const requestId = crypto.randomUUID();
    try {
        switch (messageRequest.worker) {
            case 'db':
                await handleDatabaseRequest(requestId, {
                    type,
                    id,
                    method: messageRequest.method
                });
                break;
            default:
                throw new Error('Unknown Worker');
        }
        responsesChannel.postMessage(
            generateHandoffStatusResponse(true, id)
        );
    } catch(err) {
        responsesChannel.postMessage(
            generateHandoffStatusResponse(false, id)
        );
        console.error(err);
    }
    requestMap.delete(requestId);
});

self.postMessage({
    type: 'worker-started'
});