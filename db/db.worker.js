self.addEventListener('message', (e) => {
    const port = e.ports[0];
    
    if (port) {
        if (e.data === 'Hub Worker Status Check') {
            port.postMessage('Active');
        }
    }
});