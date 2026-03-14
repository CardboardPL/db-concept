self.addEventListener('message', (e) => {
    const port = e.ports[0];
    
    if (port) {
        if (e.data === 'Database Worker Status Check') {
            port.postMessage('Active');
        }
    }
});